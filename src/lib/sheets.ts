import { google } from "googleapis";
import { prisma } from "./prisma";

// Format private key correctly to avoid common newline rendering issues in .env files
const getGoogleAuth = () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!email || !privateKeyRaw || !spreadsheetId) {
    throw new Error(
      "Missing Google Sheets integration credentials in .env file. Please define: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SPREADSHEET_ID."
    );
  }

  // Format the private key to handle both literal newlines and escaped newlines
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { auth, spreadsheetId };
};

/**
 * Ensures that the required sheets (Clients, Locations, Jobs) exist in the Google Spreadsheet.
 * If not, it creates them.
 */
async function ensureWorksheetsExist(sheetsClient: any, spreadsheetId: string) {
  const metadata = await sheetsClient.spreadsheets.get({ spreadsheetId });
  const existingSheetNames = metadata.data.sheets?.map((s: any) => s.properties?.title) || [];

  const requiredSheets = ["Clients", "Locations", "Jobs"];
  const sheetsToCreate = requiredSheets.filter((name) => !existingSheetNames.includes(name));

  if (sheetsToCreate.length > 0) {
    const requests = sheetsToCreate.map((name) => ({
      addSheet: {
        properties: { title: name },
      },
    }));

    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }
}

/**
 * EXPORT: Writes database tables (Clients, Locations, Jobs) into Google Sheets.
 */
export async function exportToGoogleSheet() {
  const { auth, spreadsheetId } = getGoogleAuth();
  const sheetsClient = google.sheets({ version: "v4", auth });

  // 1. Ensure worksheets exist
  await ensureWorksheetsExist(sheetsClient, spreadsheetId);

  // 2. Fetch all data from DB
  const dbClients = await prisma.client.findMany({ orderBy: { id: "asc" } });
  const dbLocations = await prisma.location.findMany({ orderBy: { id: "asc" } });
  const dbJobs = await prisma.job.findMany({ orderBy: { id: "asc" } });

  // 3. Format Clients data
  const clientsHeader = ["ID", "Name", "Type", "Canonical Name Key", "Created At", "Created By"];
  const clientsRows = dbClients.map((c) => [
    c.id,
    c.name,
    c.type,
    c.canonicalNameKey || "",
    c.createdAt.toISOString(),
    c.createdBy || "",
  ]);

  // 4. Format Locations data
  const locationsHeader = ["ID", "Client ID", "Name", "Installation Address", "Billing Address", "Created At", "Created By"];
  const locationsRows = dbLocations.map((l) => [
    l.id,
    l.clientId,
    l.name,
    l.installationAddress || "",
    l.billingAddress || "",
    l.createdAt.toISOString(),
    l.createdBy || "",
  ]);

  // 5. Format Jobs data
  const jobsHeader = [
    "ID",
    "Client ID",
    "Location ID",
    "Job No",
    "Sale Type",
    "System",
    "Invoice No",
    "Invoice Date",
    "Outright Value",
    "Warranty Months",
    "Warranty End",
    "Agreement No",
    "Agreement Start",
    "Agreement End",
    "Rental Amount",
    "Contact Person",
    "Contact Number",
    "BDE",
    "Status Override",
    "Created At",
    "Created By",
  ];
  const jobsRows = dbJobs.map((j) => [
    j.id,
    j.clientId,
    j.locationId,
    j.jobNo || "",
    j.saleType,
    j.system || "",
    j.invoiceNo || "",
    j.invoiceDate ? j.invoiceDate.toISOString().split("T")[0] : "",
    j.outrightValue ? j.outrightValue.toString() : "",
    j.warrantyMonths !== null ? j.warrantyMonths.toString() : "",
    j.warrantyEnd ? j.warrantyEnd.toISOString().split("T")[0] : "",
    j.agreementNo || "",
    j.agreementStart ? j.agreementStart.toISOString().split("T")[0] : "",
    j.agreementEnd ? j.agreementEnd.toISOString().split("T")[0] : "",
    j.rentalAmount ? j.rentalAmount.toString() : "",
    j.contactPerson || "",
    j.contactNumber || "",
    j.bde || "",
    j.statusOverride || "",
    j.createdAt.toISOString(),
    j.createdBy || "",
  ]);

  // 6. Overwrite Google Sheets
  const updateData = [
    { range: "Clients!A1", values: [clientsHeader, ...clientsRows] },
    { range: "Locations!A1", values: [locationsHeader, ...locationsRows] },
    { range: "Jobs!A1", values: [jobsHeader, ...jobsRows] },
  ];

  // We clear sheets first to remove old rows that might be left over
  await sheetsClient.spreadsheets.values.clear({ spreadsheetId, range: "Clients!A1:Z10000" });
  await sheetsClient.spreadsheets.values.clear({ spreadsheetId, range: "Locations!A1:Z10000" });
  await sheetsClient.spreadsheets.values.clear({ spreadsheetId, range: "Jobs!A1:Z10000" });

  await sheetsClient.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: updateData as any,
    },
  });

  return {
    clientsExported: dbClients.length,
    locationsExported: dbLocations.length,
    jobsExported: dbJobs.length,
  };
}

/**
 * Helper to find column index in a header array based on a list of acceptable aliases.
 * Matches case-insensitively and ignores spaces, dashes, and underscores.
 */
function findColumnIndex(header: string[], aliases: string[]): number {
  if (!header) return -1;
  const normalizedAliases = aliases.map(a => a.toLowerCase().replace(/[\s_-]/g, ""));
  return header.findIndex(col => {
    if (typeof col !== "string") return false;
    const normalizedCol = col.trim().toLowerCase().replace(/[\s_-]/g, "");
    return normalizedAliases.includes(normalizedCol);
  });
}

/**
 * IMPORT: Reads sheets from Google Sheets and performs upsert on DB.
 * Resolves dependency ordering: Client -> Location -> Job.
 */
export async function importFromGoogleSheet(currentUserEmail: string) {
  const { auth, spreadsheetId } = getGoogleAuth();
  const sheetsClient = google.sheets({ version: "v4", auth });

  // 1. Fetch worksheet values
  const responses = await sheetsClient.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: ["Clients!A1:Z10000", "Locations!A1:Z10000", "Jobs!A1:Z10000"],
  });

  const clientsData = responses.data.valueRanges?.[0].values || [];
  const locationsData = responses.data.valueRanges?.[1].values || [];
  const jobsData = responses.data.valueRanges?.[2].values || [];

  const logs: string[] = [];
  let clientsSynced = 0;
  let locationsSynced = 0;
  let jobsSynced = 0;

  // Pre-fetch all existing keys from DB for fast in-memory constraint validation and upsert separation
  const allClientsInDb = await prisma.client.findMany({ select: { id: true } });
  const allLocationsInDb = await prisma.location.findMany({ select: { id: true } });
  
  const existingClientIds = new Set(allClientsInDb.map((c) => c.id));
  const existingLocationIds = new Set(allLocationsInDb.map((l) => l.id));

  // Helper to run updates in parallel batches to optimize database connection utilization and maximize speed
  async function runInParallelBatches<T>(
    items: T[],
    batchSize: number,
    fn: (item: T) => Promise<any>
  ) {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.all(batch.map(fn));
    }
  }

  // --- A. Sync Clients ---
  if (clientsData.length > 1) {
    const header = clientsData[0];
    const rows = clientsData.slice(1);

    const idIdx = findColumnIndex(header, ["ID", "ClientID", "Client_ID", "Client ID"]);
    const nameIdx = findColumnIndex(header, ["Name", "ClientName", "Client_Name", "Client name"]);
    const typeIdx = findColumnIndex(header, ["Type", "ClientType", "Client_Type", "Client type"]);
    const canonicalIdx = findColumnIndex(header, ["Canonical Name Key", "CanonicalNameKey", "Canonical_Name_Key", "Canonical"]);

    if (idIdx === -1 || nameIdx === -1 || typeIdx === -1) {
      throw new Error("Invalid 'Clients' sheet. Must contain ID, Name, and Type columns.");
    }

    logs.push(`[Client Sync] Found ${rows.length} rows in sheet. Commencing DB sync...`);

    const clientsToCreate: any[] = [];
    const clientsToUpdate: any[] = [];

    for (const row of rows) {
      const id = row[idIdx];
      const name = row[nameIdx];
      const type = row[typeIdx];
      const canonicalNameKey = canonicalIdx !== -1 ? row[canonicalIdx] || null : null;

      if (!id || !name || !type) continue;

      const clientPayload = {
        id,
        name,
        type,
        canonicalNameKey,
        createdBy: currentUserEmail,
        updatedAt: new Date(),
      };

      if (existingClientIds.has(id)) {
        clientsToUpdate.push(clientPayload);
      } else {
        clientsToCreate.push({
          ...clientPayload,
          createdAt: new Date(),
        });
        existingClientIds.add(id); // register ID in-memory for relationship checks
      }
    }

    // Bulk insert new clients in 1 query
    if (clientsToCreate.length > 0) {
      await prisma.client.createMany({
        data: clientsToCreate,
      });
      clientsSynced += clientsToCreate.length;
    }

    // Parallel update existing clients in batches of 100
    if (clientsToUpdate.length > 0) {
      await runInParallelBatches(clientsToUpdate, 100, async (client) => {
        await prisma.client.update({
          where: { id: client.id },
          data: {
            name: client.name,
            type: client.type,
            canonicalNameKey: client.canonicalNameKey,
            createdBy: client.createdBy,
            updatedAt: client.updatedAt,
          },
        });
      });
      clientsSynced += clientsToUpdate.length;
    }

    logs.push(`[Client Sync] Successfully synchronized ${clientsSynced} clients.`);
  } else {
    logs.push(`[Client Sync] No records found in 'Clients' sheet.`);
  }

  // --- B. Sync Locations ---
  if (locationsData.length > 1) {
    const header = locationsData[0];
    const rows = locationsData.slice(1);

    const idIdx = findColumnIndex(header, ["ID", "Location ID", "LocationID", "Location_ID"]);
    const clientIdIdx = findColumnIndex(header, ["Client ID", "ClientID", "Client_ID"]);
    const nameIdx = findColumnIndex(header, ["Name", "LocationName", "Location_Name", "Location name"]);
    const installAddrIdx = findColumnIndex(header, ["Installation Address", "InstallationAddress", "Installation_Address", "InstallAddress", "Install_Address", "Install Address"]);
    const billingAddrIdx = findColumnIndex(header, ["Billing Address", "BillingAddress", "Billing_Address", "Billing Address"]);

    if (idIdx === -1 || clientIdIdx === -1 || nameIdx === -1) {
      throw new Error("Invalid 'Locations' sheet. Must contain ID, Client ID, and Name columns.");
    }

    logs.push(`[Location Sync] Found ${rows.length} rows in sheet. Commencing DB sync...`);

    const locationsToCreate: any[] = [];
    const locationsToUpdate: any[] = [];

    for (const row of rows) {
      const id = row[idIdx];
      const clientId = row[clientIdIdx];
      const name = row[nameIdx];
      const installationAddress = installAddrIdx !== -1 ? row[installAddrIdx] || null : null;
      const billingAddress = billingAddrIdx !== -1 ? row[billingAddrIdx] || null : null;

      if (!id || !clientId || !name) continue;

      // In-memory foreign key verification (super fast, no DB hit!)
      if (!existingClientIds.has(clientId)) {
        logs.push(`[Location Sync Warning] Skipped Location '${id}' because Client '${clientId}' does not exist.`);
        continue;
      }

      const locationPayload = {
        id,
        clientId,
        name,
        installationAddress,
        billingAddress,
        createdBy: currentUserEmail,
        updatedAt: new Date(),
      };

      if (existingLocationIds.has(id)) {
        locationsToUpdate.push(locationPayload);
      } else {
        locationsToCreate.push({
          ...locationPayload,
          createdAt: new Date(),
        });
        existingLocationIds.add(id); // register ID in-memory for relationship checks
      }
    }

    // Bulk insert new locations in 1 query
    if (locationsToCreate.length > 0) {
      await prisma.location.createMany({
        data: locationsToCreate,
      });
      locationsSynced += locationsToCreate.length;
    }

    // Parallel update existing locations in batches of 100
    if (locationsToUpdate.length > 0) {
      await runInParallelBatches(locationsToUpdate, 100, async (loc) => {
        await prisma.location.update({
          where: { id: loc.id },
          data: {
            clientId: loc.clientId,
            name: loc.name,
            installationAddress: loc.installationAddress,
            billingAddress: loc.billingAddress,
            createdBy: loc.createdBy,
            updatedAt: loc.updatedAt,
          },
        });
      });
      locationsSynced += locationsToUpdate.length;
    }

    logs.push(`[Location Sync] Successfully synchronized ${locationsSynced} locations.`);
  } else {
    logs.push(`[Location Sync] No records found in 'Locations' sheet.`);
  }

  // --- C. Sync Jobs ---
  if (jobsData.length > 1) {
    const header = jobsData[0];
    const rows = jobsData.slice(1);

    const idIdx = findColumnIndex(header, ["ID", "Job ID", "JobID", "Job_ID"]);
    const clientIdIdx = findColumnIndex(header, ["Client ID", "ClientID", "Client_ID"]);
    const locationIdIdx = findColumnIndex(header, ["Location ID", "LocationID", "Location_ID"]);
    const jobNoIdx = findColumnIndex(header, ["Job No", "JobNo", "Job_No", "JobNumber", "Job_Number", "Job number"]);
    const saleTypeIdx = findColumnIndex(header, ["Sale Type", "SaleType", "Sale_Type", "Sale type"]);
    const systemIdx = findColumnIndex(header, ["System"]);
    const invoiceNoIdx = findColumnIndex(header, ["Invoice No", "InvoiceNo", "Invoice_No", "InvoiceNumber", "Invoice_Number", "Invoice number"]);
    const invoiceDateIdx = findColumnIndex(header, ["Invoice Date", "InvoiceDate", "Invoice_Date", "Invoice date"]);
    const outrightValueIdx = findColumnIndex(header, ["Outright Value", "OutrightValue", "Outright_Value", "Outright value", "Value"]);
    const warrantyMonthsIdx = findColumnIndex(header, ["Warranty Months", "WarrantyMonths", "Warranty_Months", "Warranty months", "Warranty"]);
    const warrantyEndIdx = findColumnIndex(header, ["Warranty End", "WarrantyEnd", "Warranty_End", "Warranty end"]);
    const agreementNoIdx = findColumnIndex(header, ["Agreement No", "AgreementNo", "Agreement_No", "Agreement ID", "AgreementID", "Agreement_ID", "Agreement number"]);
    const agStartIdx = findColumnIndex(header, ["Agreement Start", "AgreementStart", "Agreement_Start", "Agreement start"]);
    const agEndIdx = findColumnIndex(header, ["Agreement End", "AgreementEnd", "Agreement_End", "Agreement end"]);
    const rentalAmountIdx = findColumnIndex(header, ["Rental Amount", "RentalAmount", "Rental_Amount", "Rental amount", "Rental"]);
    const contactPersonIdx = findColumnIndex(header, ["Contact Person", "ContactPerson", "Contact_Person", "Contact person"]);
    const contactNumberIdx = findColumnIndex(header, ["Contact Number", "ContactNumber", "Contact_Number", "Contact number", "ContactPhone", "Contact_Phone", "Contact phone"]);
    const bdeIdx = findColumnIndex(header, ["BDE", "SalesPerson", "Sales_Person", "Sales person", "Agent"]);
    const statusOverrideIdx = findColumnIndex(header, ["Status Override", "StatusOverride", "Status_Override", "Status override", "Status"]);

    if (idIdx === -1 || clientIdIdx === -1 || locationIdIdx === -1 || saleTypeIdx === -1) {
      throw new Error("Invalid 'Jobs' sheet. Must contain ID, Client ID, Location ID, and Sale Type columns.");
    }

    logs.push(`[Job Sync] Found ${rows.length} rows in sheet. Commencing DB sync...`);

    // Pre-fetch all existing Job IDs in 1 query for in-memory upsert classification
    const allJobsInDb = await prisma.job.findMany({ select: { id: true } });
    const existingJobIds = new Set(allJobsInDb.map((j) => j.id));

    const jobsToCreate: any[] = [];
    const jobsToUpdate: any[] = [];

    for (const row of rows) {
      const id = row[idIdx];
      const clientId = row[clientIdIdx];
      const locationId = row[locationIdIdx];
      const saleType = row[saleTypeIdx];

      if (!id || !clientId || !locationId || !saleType) continue;

      // In-memory verification of constraints (super fast!)
      if (!existingClientIds.has(clientId) || !existingLocationIds.has(locationId)) {
        logs.push(
          `[Job Sync Warning] Skipped Job '${id}' because Client '${clientId}' or Location '${locationId}' was not found.`
        );
        continue;
      }

      // Map parsed values safely
      const jobNo = jobNoIdx !== -1 ? row[jobNoIdx] || null : null;
      const system = systemIdx !== -1 ? row[systemIdx] || null : null;
      const invoiceNo = invoiceNoIdx !== -1 ? row[invoiceNoIdx] || null : null;

      const invoiceDate = invoiceDateIdx !== -1 && row[invoiceDateIdx] ? new Date(row[invoiceDateIdx]) : null;
      const outrightValue = outrightValueIdx !== -1 && row[outrightValueIdx] ? parseFloat(row[outrightValueIdx]) : null;
      const warrantyMonths = warrantyMonthsIdx !== -1 && row[warrantyMonthsIdx] ? parseInt(row[warrantyMonthsIdx]) : null;
      const warrantyEnd = warrantyEndIdx !== -1 && row[warrantyEndIdx] ? new Date(row[warrantyEndIdx]) : null;

      const agreementNo = agreementNoIdx !== -1 ? row[agreementNoIdx] || null : null;
      const agreementStart = agStartIdx !== -1 && row[agStartIdx] ? new Date(row[agStartIdx]) : null;
      const agreementEnd = agEndIdx !== -1 && row[agEndIdx] ? new Date(row[agEndIdx]) : null;
      const rentalAmount = rentalAmountIdx !== -1 && row[rentalAmountIdx] ? parseFloat(row[rentalAmountIdx]) : null;

      const contactPerson = contactPersonIdx !== -1 ? row[contactPersonIdx] || null : null;
      const contactNumber = contactNumberIdx !== -1 ? row[contactNumberIdx] || null : null;
      const bde = bdeIdx !== -1 ? row[bdeIdx] || null : null;
      const statusOverride = statusOverrideIdx !== -1 ? row[statusOverrideIdx] || null : null;

      const jobPayload = {
        id,
        clientId,
        locationId,
        jobNo,
        saleType,
        system,
        invoiceNo,
        invoiceDate,
        outrightValue,
        warrantyMonths,
        warrantyEnd,
        agreementNo,
        agreementStart,
        agreementEnd,
        rentalAmount,
        contactPerson,
        contactNumber,
        bde,
        statusOverride,
        createdBy: currentUserEmail,
        updatedAt: new Date(),
      };

      if (existingJobIds.has(id)) {
        jobsToUpdate.push(jobPayload);
      } else {
        jobsToCreate.push({
          ...jobPayload,
          createdAt: new Date(),
        });
        existingJobIds.add(id);
      }
    }

    // Bulk insert new jobs in 1 query
    if (jobsToCreate.length > 0) {
      await prisma.job.createMany({
        data: jobsToCreate,
      });
      jobsSynced += jobsToCreate.length;
    }

    // Parallel update existing jobs in batches of 100
    if (jobsToUpdate.length > 0) {
      await runInParallelBatches(jobsToUpdate, 100, async (job) => {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            clientId: job.clientId,
            locationId: job.locationId,
            jobNo: job.jobNo,
            saleType: job.saleType,
            system: job.system,
            invoiceNo: job.invoiceNo,
            invoiceDate: job.invoiceDate,
            outrightValue: job.outrightValue,
            warrantyMonths: job.warrantyMonths,
            warrantyEnd: job.warrantyEnd,
            agreementNo: job.agreementNo,
            agreementStart: job.agreementStart,
            agreementEnd: job.agreementEnd,
            rentalAmount: job.rentalAmount,
            contactPerson: job.contactPerson,
            contactNumber: job.contactNumber,
            bde: job.bde,
            statusOverride: job.statusOverride,
            createdBy: job.createdBy,
            updatedAt: job.updatedAt,
          },
        });
      });
      jobsSynced += jobsToUpdate.length;
    }

    logs.push(`[Job Sync] Successfully synchronized ${jobsSynced} jobs.`);
  } else {
    logs.push(`[Job Sync] No records found in 'Jobs' sheet.`);
  }

  return {
    clientsSynced,
    locationsSynced,
    jobsSynced,
    logs,
  };
}
