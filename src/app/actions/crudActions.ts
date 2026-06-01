"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Standard security role verification helper.
 * Only ADMIN or EDITOR can perform CRUD actions.
 */
async function verifyWritePermission() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("You must be logged in to perform this action.");
  }
  if (user.role !== "ADMIN" && user.role !== "EDITOR") {
    throw new Error("Access Denied: Only Administrators or Editors are authorized to modify data.");
  }
  return user;
}

/**
 * Helper to normalize and compute canonical key for fuzzy matching
 */
function computeCanonicalKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// ==========================================
// CLIENT CRUD ACTIONS
// ==========================================

export async function createClientAction(data: {
  id: string;
  name: string;
  type: string;
}) {
  try {
    const user = await verifyWritePermission();
    
    // Clean and validate ID format (e.g. CLI-00003-U)
    const cleanedId = data.id.trim();
    if (!/^CLI-\d{5}-U$/.test(cleanedId)) {
      return {
        success: false,
        error: "Invalid Client ID format. Must match CLI-XXXXX-U (e.g. CLI-00003-U).",
      };
    }

    // Check duplication
    const duplicate = await prisma.client.findUnique({ where: { id: cleanedId } });
    if (duplicate) {
      return { success: false, error: `Client ID '${cleanedId}' already exists.` };
    }

    const canonicalNameKey = computeCanonicalKey(data.name);

    await prisma.client.create({
      data: {
        id: cleanedId,
        name: data.name.trim(),
        type: data.type,
        canonicalNameKey,
        createdBy: user.email,
      },
    });

    revalidatePath("/");
    return { success: true, message: `Successfully registered client ${data.name}.` };
  } catch (error: any) {
    console.error("createClientAction error:", error);
    return { success: false, error: error.message || "Failed to create client." };
  }
}

export async function updateClientAction(data: {
  id: string;
  name: string;
  type: string;
}) {
  try {
    const user = await verifyWritePermission();

    const canonicalNameKey = computeCanonicalKey(data.name);

    await prisma.client.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        type: data.type,
        canonicalNameKey,
        createdBy: user.email,
      },
    });

    revalidatePath("/");
    return { success: true, message: `Successfully updated client ${data.name}.` };
  } catch (error: any) {
    console.error("updateClientAction error:", error);
    return { success: false, error: error.message || "Failed to update client." };
  }
}

export async function deleteClientAction(id: string) {
  try {
    await verifyWritePermission();

    await prisma.client.delete({
      where: { id },
    });

    revalidatePath("/");
    return { success: true, message: "Client and all its associated locations and jobs were successfully deleted." };
  } catch (error: any) {
    console.error("deleteClientAction error:", error);
    return { success: false, error: error.message || "Failed to delete client." };
  }
}

// ==========================================
// LOCATION CRUD ACTIONS
// ==========================================

export async function createLocationAction(data: {
  id: string;
  clientId: string;
  name: string;
  installationAddress?: string | null;
  billingAddress?: string | null;
}) {
  try {
    const user = await verifyWritePermission();

    // Clean and validate ID format (e.g. LOC-000003-U)
    const cleanedId = data.id.trim();
    if (!/^LOC-\d{6}-U$/.test(cleanedId)) {
      return {
        success: false,
        error: "Invalid Location ID format. Must match LOC-XXXXXX-U (e.g. LOC-000003-U).",
      };
    }

    // Check duplicate
    const duplicate = await prisma.location.findUnique({ where: { id: cleanedId } });
    if (duplicate) {
      return { success: false, error: `Location ID '${cleanedId}' already exists.` };
    }

    // Verify parent client
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) {
      return { success: false, error: `Parent Client ID '${data.clientId}' not found.` };
    }

    await prisma.location.create({
      data: {
        id: cleanedId,
        clientId: data.clientId,
        name: data.name.trim(),
        installationAddress: data.installationAddress?.trim() || null,
        billingAddress: data.billingAddress?.trim() || null,
        createdBy: user.email,
      },
    });

    revalidatePath("/");
    return { success: true, message: `Successfully added location ${data.name}.` };
  } catch (error: any) {
    console.error("createLocationAction error:", error);
    return { success: false, error: error.message || "Failed to create location." };
  }
}

export async function updateLocationAction(data: {
  id: string;
  clientId: string;
  name: string;
  installationAddress?: string | null;
  billingAddress?: string | null;
}) {
  try {
    const user = await verifyWritePermission();

    // Verify parent client
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) {
      return { success: false, error: `Parent Client ID '${data.clientId}' not found.` };
    }

    await prisma.location.update({
      where: { id: data.id },
      data: {
        clientId: data.clientId,
        name: data.name.trim(),
        installationAddress: data.installationAddress?.trim() || null,
        billingAddress: data.billingAddress?.trim() || null,
        createdBy: user.email,
      },
    });

    revalidatePath("/");
    return { success: true, message: `Successfully updated location ${data.name}.` };
  } catch (error: any) {
    console.error("updateLocationAction error:", error);
    return { success: false, error: error.message || "Failed to update location." };
  }
}

export async function deleteLocationAction(id: string) {
  try {
    await verifyWritePermission();

    await prisma.location.delete({
      where: { id },
    });

    revalidatePath("/");
    return { success: true, message: "Location and all its associated jobs were successfully deleted." };
  } catch (error: any) {
    console.error("deleteLocationAction error:", error);
    return { success: false, error: error.message || "Failed to delete location." };
  }
}

// ==========================================
// JOB CRUD ACTIONS
// ==========================================

export interface JobFormInput {
  id: string;
  clientId: string;
  locationId: string;
  jobNo?: string | null;
  saleType: string;
  system?: string | null;
  invoiceNo?: string | null;
  invoiceDate?: string | null;
  outrightValue?: number | null;
  warrantyMonths?: number | null;
  warrantyEnd?: string | null;
  agreementNo?: string | null;
  agreementStart?: string | null;
  agreementEnd?: string | null;
  rentalAmount?: number | null;
  contactPerson?: string | null;
  contactNumber?: string | null;
  bde?: string | null;
  statusOverride?: string | null;
}

export async function createJobAction(data: JobFormInput) {
  try {
    const user = await verifyWritePermission();

    // Clean and validate ID format (e.g. JOB-000003-U)
    const cleanedId = data.id.trim();
    if (!/^JOB-\d{6}-U$/.test(cleanedId)) {
      return {
        success: false,
        error: "Invalid Job ID format. Must match JOB-XXXXXX-U (e.g. JOB-000003-U).",
      };
    }

    // Check duplicate
    const duplicate = await prisma.job.findUnique({ where: { id: cleanedId } });
    if (duplicate) {
      return { success: false, error: `Job ID '${cleanedId}' already exists.` };
    }

    // Verify parent client & location
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) {
      return { success: false, error: `Client ID '${data.clientId}' not found.` };
    }
    const location = await prisma.location.findUnique({ where: { id: data.locationId } });
    if (!location) {
      return { success: false, error: `Location ID '${data.locationId}' not found.` };
    }

    await prisma.job.create({
      data: {
        id: cleanedId,
        clientId: data.clientId,
        locationId: data.locationId,
        jobNo: data.jobNo?.trim() || null,
        saleType: data.saleType,
        system: data.system?.trim() || null,
        invoiceNo: data.invoiceNo?.trim() || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        outrightValue: data.outrightValue ? Number(data.outrightValue) : null,
        warrantyMonths: data.warrantyMonths !== undefined && data.warrantyMonths !== null ? Number(data.warrantyMonths) : null,
        warrantyEnd: data.warrantyEnd ? new Date(data.warrantyEnd) : null,
        agreementNo: data.agreementNo?.trim() || null,
        agreementStart: data.agreementStart ? new Date(data.agreementStart) : null,
        agreementEnd: data.agreementEnd ? new Date(data.agreementEnd) : null,
        rentalAmount: data.rentalAmount ? Number(data.rentalAmount) : null,
        contactPerson: data.contactPerson?.trim() || null,
        contactNumber: data.contactNumber?.trim() || null,
        bde: data.bde?.trim() || null,
        statusOverride: data.statusOverride?.trim() || null,
        createdBy: user.email,
      },
    });

    revalidatePath("/");
    return { success: true, message: `Successfully logged Job ${cleanedId}.` };
  } catch (error: any) {
    console.error("createJobAction error:", error);
    return { success: false, error: error.message || "Failed to create job." };
  }
}

export async function updateJobAction(data: JobFormInput) {
  try {
    const user = await verifyWritePermission();

    // Verify parent client & location
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) {
      return { success: false, error: `Client ID '${data.clientId}' not found.` };
    }
    const location = await prisma.location.findUnique({ where: { id: data.locationId } });
    if (!location) {
      return { success: false, error: `Location ID '${data.locationId}' not found.` };
    }

    await prisma.job.update({
      where: { id: data.id },
      data: {
        clientId: data.clientId,
        locationId: data.locationId,
        jobNo: data.jobNo?.trim() || null,
        saleType: data.saleType,
        system: data.system?.trim() || null,
        invoiceNo: data.invoiceNo?.trim() || null,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : null,
        outrightValue: data.outrightValue ? Number(data.outrightValue) : null,
        warrantyMonths: data.warrantyMonths !== undefined && data.warrantyMonths !== null ? Number(data.warrantyMonths) : null,
        warrantyEnd: data.warrantyEnd ? new Date(data.warrantyEnd) : null,
        agreementNo: data.agreementNo?.trim() || null,
        agreementStart: data.agreementStart ? new Date(data.agreementStart) : null,
        agreementEnd: data.agreementEnd ? new Date(data.agreementEnd) : null,
        rentalAmount: data.rentalAmount ? Number(data.rentalAmount) : null,
        contactPerson: data.contactPerson?.trim() || null,
        contactNumber: data.contactNumber?.trim() || null,
        bde: data.bde?.trim() || null,
        statusOverride: data.statusOverride?.trim() || null,
        createdBy: user.email,
      },
    });

    revalidatePath("/");
    return { success: true, message: `Successfully updated Job ${data.id}.` };
  } catch (error: any) {
    console.error("updateJobAction error:", error);
    return { success: false, error: error.message || "Failed to update job." };
  }
}

export async function deleteJobAction(id: string) {
  try {
    await verifyWritePermission();

    await prisma.job.delete({
      where: { id },
    });

    revalidatePath("/");
    return { success: true, message: `Job ${id} has been successfully deleted.` };
  } catch (error: any) {
    console.error("deleteJobAction error:", error);
    return { success: false, error: error.message || "Failed to delete job." };
  }
}
