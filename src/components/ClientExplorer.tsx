"use client";

import { useState, useMemo, useEffect } from "react";
import {
  createClientAction,
  updateClientAction,
  deleteClientAction,
  createLocationAction,
  updateLocationAction,
  deleteLocationAction,
  createJobAction,
  updateJobAction,
  deleteJobAction,
  JobFormInput
} from "@/app/actions/crudActions";

export interface SerializedJob {
  id: string;
  clientId: string;
  locationId: string;
  jobNo: string | null;
  saleType: string;
  system: string | null;
  invoiceNo: string | null;
  invoiceDate: string | null;
  outrightValue: number | null;
  warrantyMonths: number | null;
  warrantyEnd: string | null;
  agreementNo: string | null;
  agreementStart: string | null;
  agreementEnd: string | null;
  rentalAmount: number | null;
  contactPerson: string | null;
  contactNumber: string | null;
  bde: string | null;
  statusOverride: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
}

export interface SerializedLocation {
  id: string;
  clientId: string;
  name: string;
  installationAddress: string | null;
  billingAddress: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
}

export interface SerializedClient {
  id: string;
  name: string;
  type: string;
  canonicalNameKey: string | null;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  locations: SerializedLocation[];
  jobs: SerializedJob[];
}

interface ClientExplorerProps {
  initialClients: SerializedClient[];
  userRole: string;
}

export default function ClientExplorer({ initialClients, userRole }: ClientExplorerProps) {
  const isWritable = userRole === "ADMIN" || userRole === "EDITOR";

  // Filter States
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "Corporate" | "Residence">("ALL");
  const [saleTypeFilter, setSaleTypeFilter] = useState<"ALL" | "OUTRIGHT" | "RENTAL" | "AMC" | "NHW">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "Active" | "Non-Active">("ALL");

  // Accordion Expanded States
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Modal Configuration State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    target: "client" | "location" | "job";
    mode: "create" | "edit";
    initialData?: any;
  }>({
    isOpen: false,
    target: "client",
    mode: "create",
  });

  // Deletion Confirmation Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    target: "client" | "location" | "job";
    id: string;
    label: string;
  } | null>(null);

  // Form Processing Loading State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Field States
  const [clientIdField, setClientIdField] = useState("");
  const [clientNameField, setClientNameField] = useState("");
  const [clientTypeField, setClientTypeField] = useState("Corporate");

  const [locationIdField, setLocationIdField] = useState("");
  const [locationClientIdField, setLocationClientIdField] = useState("");
  const [locationNameField, setLocationNameField] = useState("");
  const [locationInstallAddrField, setLocationInstallAddrField] = useState("");
  const [locationBillingAddrField, setLocationBillingAddrField] = useState("");

  const [jobIdField, setJobIdField] = useState("");
  const [jobClientIdField, setJobClientIdField] = useState("");
  const [jobLocationIdField, setJobLocationIdField] = useState("");
  const [jobNoField, setJobNoField] = useState("");
  const [jobSaleTypeField, setJobSaleTypeField] = useState("OUTRIGHT");
  const [jobSystemField, setJobSystemField] = useState("");
  const [jobInvoiceNoField, setJobInvoiceNoField] = useState("");
  const [jobInvoiceDateField, setJobInvoiceDateField] = useState("");
  const [jobOutrightValueField, setJobOutrightValueField] = useState("");
  const [jobWarrantyMonthsField, setJobWarrantyMonthsField] = useState("");
  const [jobWarrantyEndField, setJobWarrantyEndField] = useState("");
  const [jobAgreementNoField, setJobAgreementNoField] = useState("");
  const [jobAgreementStartField, setJobAgreementStartField] = useState("");
  const [jobAgreementEndField, setJobAgreementEndField] = useState("");
  const [jobRentalAmountField, setJobRentalAmountField] = useState("");
  const [jobContactPersonField, setJobContactPersonField] = useState("");
  const [jobContactNumberField, setJobContactNumberField] = useState("");
  const [jobBdeField, setJobBdeField] = useState("");
  const [jobStatusOverrideField, setJobStatusOverrideField] = useState("");

  // Clean form fields
  const resetFormFields = () => {
    setClientIdField("");
    setClientNameField("");
    setClientTypeField("Corporate");

    setLocationIdField("");
    setLocationClientIdField("");
    setLocationNameField("");
    setLocationInstallAddrField("");
    setLocationBillingAddrField("");

    setJobIdField("");
    setJobClientIdField("");
    setJobLocationIdField("");
    setJobNoField("");
    setJobSaleTypeField("OUTRIGHT");
    setJobSystemField("");
    setJobInvoiceNoField("");
    setJobInvoiceDateField("");
    setJobOutrightValueField("");
    setJobWarrantyMonthsField("");
    setJobWarrantyEndField("");
    setJobAgreementNoField("");
    setJobAgreementStartField("");
    setJobAgreementEndField("");
    setJobRentalAmountField("");
    setJobContactPersonField("");
    setJobContactNumberField("");
    setJobBdeField("");
    setJobStatusOverrideField("");
  };

  // Toggle client expansion
  const toggleClient = (clientId: string) => {
    setExpandedClients((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  // Helper to compute active status for a job
  // A job is "Non-Active" when its warranty end date (OUTRIGHT) or agreement end date (RENTAL/AMC/NHW) has passed.
  const getJobStatus = (job: SerializedJob) => {
    if (job.statusOverride) {
      return {
        label: job.statusOverride,
        isActive: job.statusOverride.toLowerCase() === "active" || job.statusOverride.toLowerCase() === "yes",
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (job.saleType === "OUTRIGHT") {
      if (!job.warrantyEnd) return { label: "Non-Active", isActive: false };
      const end = new Date(job.warrantyEnd);
      return {
        label: end >= today ? "Active" : "Non-Active",
        isActive: end >= today,
      };
    } else {
      if (!job.agreementEnd) return { label: "Non-Active", isActive: false };
      const end = new Date(job.agreementEnd);
      return {
        label: end >= today ? "Active" : "Non-Active",
        isActive: end >= today,
      };
    }
  };

  // ID Generation Helpers
  const generateNextClientId = () => {
    let maxNum = 0;
    initialClients.forEach((c) => {
      const match = c.id.match(/^CLI-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `CLI-${String(maxNum + 1).padStart(5, "0")}-U`;
  };

  const generateNextLocationId = () => {
    let maxNum = 0;
    initialClients.forEach((c) => {
      c.locations.forEach((l) => {
        const match = l.id.match(/^LOC-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
    });
    return `LOC-${String(maxNum + 1).padStart(6, "0")}-U`;
  };

  const generateNextJobId = () => {
    let maxNum = 0;
    initialClients.forEach((c) => {
      c.jobs.forEach((j) => {
        const match = j.id.match(/^JOB-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
    });
    return `JOB-${String(maxNum + 1).padStart(6, "0")}-U`;
  };

  // Filter clients dynamically based on search, client type, job saleType, and computed active status
  const filteredClients = useMemo(() => {
    return initialClients.filter((client) => {
      // 1. Client Type filter
      if (typeFilter !== "ALL" && client.type !== typeFilter) {
        return false;
      }

      // 2. Sale Type filter (check if client has any job with matching saleType)
      if (saleTypeFilter !== "ALL") {
        const hasMatchingJob = client.jobs.some((job) => job.saleType === saleTypeFilter);
        if (!hasMatchingJob) return false;
      }

      // 3. Computed Status filter (check if client has any job with matching active status)
      if (statusFilter !== "ALL") {
        const hasMatchingJob = client.jobs.some((job) => {
          const status = getJobStatus(job);
          const filterIsActive = statusFilter === "Active";
          return status.isActive === filterIsActive;
        });
        if (!hasMatchingJob) return false;
      }

      // 4. Text search matching Client, Location or Job contents
      if (!search.trim()) return true;
      const term = search.toLowerCase();

      const matchClient =
        client.id.toLowerCase().includes(term) ||
        client.name.toLowerCase().includes(term) ||
        client.type.toLowerCase().includes(term);

      const matchLocation = client.locations.some(
        (loc) =>
          loc.id.toLowerCase().includes(term) ||
          loc.name.toLowerCase().includes(term) ||
          (loc.installationAddress && loc.installationAddress.toLowerCase().includes(term)) ||
          (loc.billingAddress && loc.billingAddress.toLowerCase().includes(term))
      );

      const matchJob = client.jobs.some(
        (job) =>
          job.id.toLowerCase().includes(term) ||
          (job.jobNo && job.jobNo.toLowerCase().includes(term)) ||
          job.saleType.toLowerCase().includes(term) ||
          (job.system && job.system.toLowerCase().includes(term)) ||
          (job.invoiceNo && job.invoiceNo.toLowerCase().includes(term)) ||
          (job.contactPerson && job.contactPerson.toLowerCase().includes(term)) ||
          (job.contactNumber && job.contactNumber.toLowerCase().includes(term)) ||
          (job.bde && job.bde.toLowerCase().includes(term))
      );

      return matchClient || matchLocation || matchJob;
    });
  }, [initialClients, search, typeFilter, saleTypeFilter, statusFilter]);

  const hasActiveFilters = search || typeFilter !== "ALL" || saleTypeFilter !== "ALL" || statusFilter !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setSaleTypeFilter("ALL");
    setStatusFilter("ALL");
  };

  // Open Form Modal Handlers
  const handleOpenCreateClient = () => {
    resetFormFields();
    setClientIdField(generateNextClientId());
    setModalConfig({
      isOpen: true,
      target: "client",
      mode: "create",
    });
  };

  const handleOpenEditClient = (client: SerializedClient, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent accordion toggle
    resetFormFields();
    setClientIdField(client.id);
    setClientNameField(client.name);
    setClientTypeField(client.type);
    setModalConfig({
      isOpen: true,
      target: "client",
      mode: "edit",
      initialData: client,
    });
  };

  const handleOpenCreateLocation = (clientId: string) => {
    resetFormFields();
    setLocationIdField(generateNextLocationId());
    setLocationClientIdField(clientId);
    setModalConfig({
      isOpen: true,
      target: "location",
      mode: "create",
      initialData: { clientId },
    });
  };

  const handleOpenEditLocation = (loc: SerializedLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    resetFormFields();
    setLocationIdField(loc.id);
    setLocationClientIdField(loc.clientId);
    setLocationNameField(loc.name);
    setLocationInstallAddrField(loc.installationAddress || "");
    setLocationBillingAddrField(loc.billingAddress || "");
    setModalConfig({
      isOpen: true,
      target: "location",
      mode: "edit",
      initialData: loc,
    });
  };

  const handleOpenCreateJob = (clientId: string, locationId: string) => {
    resetFormFields();
    setJobIdField(generateNextJobId());
    setJobClientIdField(clientId);
    setJobLocationIdField(locationId);
    setModalConfig({
      isOpen: true,
      target: "job",
      mode: "create",
      initialData: { clientId, locationId },
    });
  };

  const handleOpenEditJob = (job: SerializedJob, e: React.MouseEvent) => {
    e.stopPropagation();
    resetFormFields();
    setJobIdField(job.id);
    setJobClientIdField(job.clientId);
    setJobLocationIdField(job.locationId);
    setJobNoField(job.jobNo || "");
    setJobSaleTypeField(job.saleType);
    setJobSystemField(job.system || "");
    setJobInvoiceNoField(job.invoiceNo || "");
    setJobInvoiceDateField(job.invoiceDate || "");
    setJobOutrightValueField(job.outrightValue ? String(job.outrightValue) : "");
    setJobWarrantyMonthsField(job.warrantyMonths !== null ? String(job.warrantyMonths) : "");
    setJobWarrantyEndField(job.warrantyEnd || "");
    setJobAgreementNoField(job.agreementNo || "");
    setJobAgreementStartField(job.agreementStart || "");
    setJobAgreementEndField(job.agreementEnd || "");
    setJobRentalAmountField(job.rentalAmount ? String(job.rentalAmount) : "");
    setJobContactPersonField(job.contactPerson || "");
    setJobContactNumberField(job.contactNumber || "");
    setJobBdeField(job.bde || "");
    setJobStatusOverrideField(job.statusOverride || "");

    setModalConfig({
      isOpen: true,
      target: "job",
      mode: "edit",
      initialData: job,
    });
  };

  // Form Submit Handler
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWritable) return;
    setIsSubmitting(true);

    try {
      let response: { success: boolean; error?: string; message?: string };

      if (modalConfig.target === "client") {
        if (modalConfig.mode === "create") {
          response = await createClientAction({
            id: clientIdField,
            name: clientNameField,
            type: clientTypeField,
          });
        } else {
          response = await updateClientAction({
            id: clientIdField,
            name: clientNameField,
            type: clientTypeField,
          });
        }
      } else if (modalConfig.target === "location") {
        if (modalConfig.mode === "create") {
          response = await createLocationAction({
            id: locationIdField,
            clientId: locationClientIdField,
            name: locationNameField,
            installationAddress: locationInstallAddrField || null,
            billingAddress: locationBillingAddrField || null,
          });
        } else {
          response = await updateLocationAction({
            id: locationIdField,
            clientId: locationClientIdField,
            name: locationNameField,
            installationAddress: locationInstallAddrField || null,
            billingAddress: locationBillingAddrField || null,
          });
        }
      } else {
        // Job Form Submission
        const jobData: JobFormInput = {
          id: jobIdField,
          clientId: jobClientIdField,
          locationId: jobLocationIdField,
          jobNo: jobNoField || null,
          saleType: jobSaleTypeField,
          system: jobSystemField || null,
          invoiceNo: jobInvoiceNoField || null,
          invoiceDate: jobInvoiceDateField || null,
          outrightValue: jobOutrightValueField ? parseFloat(jobOutrightValueField) : null,
          warrantyMonths: jobWarrantyMonthsField ? parseInt(jobWarrantyMonthsField, 10) : null,
          warrantyEnd: jobWarrantyEndField || null,
          agreementNo: jobAgreementNoField || null,
          agreementStart: jobAgreementStartField || null,
          agreementEnd: jobAgreementEndField || null,
          rentalAmount: jobRentalAmountField ? parseFloat(jobRentalAmountField) : null,
          contactPerson: jobContactPersonField || null,
          contactNumber: jobContactNumberField || null,
          bde: jobBdeField || null,
          statusOverride: jobStatusOverrideField || null,
        };

        if (modalConfig.mode === "create") {
          response = await createJobAction(jobData);
        } else {
          response = await updateJobAction(jobData);
        }
      }

      if (response.success) {
        setToast({ message: response.message || "Operation successful!", type: "success" });
        setModalConfig({ ...modalConfig, isOpen: false });
        resetFormFields();
      } else {
        setToast({ message: response.error || "An error occurred.", type: "error" });
      }
    } catch (err: any) {
      console.error("Form Submit Error:", err);
      setToast({ message: err.message || "Failed to submit request.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Click Handlers
  const handleOpenDeleteClient = (client: SerializedClient, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({
      isOpen: true,
      target: "client",
      id: client.id,
      label: `Client '${client.name}' (${client.id}) and all of its locations and jobs`,
    });
  };

  const handleOpenDeleteLocation = (loc: SerializedLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({
      isOpen: true,
      target: "location",
      id: loc.id,
      label: `Location '${loc.name}' (${loc.id}) and all its logged jobs`,
    });
  };

  const handleOpenDeleteJob = (job: SerializedJob, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({
      isOpen: true,
      target: "job",
      id: job.id,
      label: `Job ID '${job.id}'`,
    });
  };

  const executeDeleteAction = async () => {
    if (!deleteConfirm || !isWritable) return;
    setIsSubmitting(true);

    try {
      let response: { success: boolean; error?: string; message?: string };
      if (deleteConfirm.target === "client") {
        response = await deleteClientAction(deleteConfirm.id);
      } else if (deleteConfirm.target === "location") {
        response = await deleteLocationAction(deleteConfirm.id);
      } else {
        response = await deleteJobAction(deleteConfirm.id);
      }

      if (response.success) {
        setToast({ message: response.message || "Item deleted successfully.", type: "success" });
        setDeleteConfirm(null);
      } else {
        setToast({ message: response.error || "Failed to delete.", type: "error" });
      }
    } catch (err: any) {
      console.error("Deletion Error:", err);
      setToast({ message: err.message || "Deletion failed.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-paper border border-line rounded-[var(--radius)] shadow-card relative">

      {/* Dynamic Toast System */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-5 py-3.5 rounded-[var(--radius)] shadow-lg font-bold text-xs uppercase tracking-wider animate-slide-up flex items-center gap-3.5 border ${toast.type === "success"
            ? "bg-active-bg text-active-fg border-active-dot/15"
            : "bg-red-soft text-red-deep border-red/15"
          }`}>
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2.5 opacity-60 hover:opacity-100 font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* Explorer Header / Controls — sticky below topbar */}
      <div className="sticky top-0 z-30 bg-paper border-b border-line rounded-t-[var(--radius)] shadow-[0_2px_8px_rgba(14,31,56,0.06)]">  
        {/* Title row */}
        <div className="px-6 pt-5 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-line/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-navy/6 flex items-center justify-center text-lg select-none flex-shrink-0">
              📂
            </div>
            <div>
              <h2 className="font-heading font-bold text-[17px] text-navy tracking-tight leading-tight">
                Client Explorer
              </h2>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Search, filter and manage clients · locations · jobs
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center flex-shrink-0">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[11px] font-bold text-red hover:text-red-deep bg-red-soft/70 hover:bg-red-soft px-3 py-1.5 rounded-[5px] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="text-[10px]">✕</span> Clear Filters
              </button>
            )}
            {isWritable && (
              <button
                onClick={handleOpenCreateClient}
                className="px-4 py-2 bg-active-dot hover:bg-active-dot/90 text-white font-bold text-[11px] uppercase tracking-wider rounded-[6px] shadow-sm transition-all whitespace-nowrap cursor-pointer hover:-translate-y-[1px] active:translate-y-0 flex items-center gap-1.5"
              >
                <span className="text-base leading-none">+</span> Add Client
              </button>
            )}
          </div>
        </div>

        {/* Filters row */}
        <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-3">
          {/* Search */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] uppercase font-bold text-ink-faint tracking-[0.1em]">Search</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint text-sm select-none pointer-events-none">🔍</span>
              <input
                type="text"
                placeholder="Name, ID, address, BDE, ref…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-cream/60 border border-line hover:border-line-strong focus:border-navy focus:bg-white text-ink text-[12.5px] pl-9 pr-8 py-2 rounded-[6px] transition-all outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-[10px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Client Type Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] uppercase font-bold text-ink-faint tracking-[0.1em]">Client Type</label>
            <div className="flex bg-cream border border-line p-[3px] rounded-[6px] text-[11px] h-[34px]">
              {(["ALL", "Corporate", "Residence"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`flex-1 text-center rounded-[4px] font-bold tracking-wide transition-all cursor-pointer ${
                    typeFilter === t
                      ? "bg-navy text-white shadow-sm"
                      : "text-ink-muted hover:text-navy hover:bg-white/60"
                  }`}
                >
                  {t === "ALL" ? "All" : t}
                </button>
              ))}
            </div>
          </div>

          {/* Sale Type Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] uppercase font-bold text-ink-faint tracking-[0.1em]">Sale Type</label>
            <div className="flex bg-cream border border-line p-[3px] rounded-[6px] text-[11px] h-[34px]">
              {(["ALL", "OUTRIGHT", "RENTAL", "AMC", "NHW"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSaleTypeFilter(st)}
                  className={`flex-1 min-w-0 text-center rounded-[4px] font-bold tracking-wide transition-all cursor-pointer text-[10px] ${
                    saleTypeFilter === st
                      ? "bg-navy text-white shadow-sm"
                      : "text-ink-muted hover:text-navy hover:bg-white/60"
                  }`}
                >
                  {st === "ALL" ? "All" : st}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[9.5px] uppercase font-bold text-ink-faint tracking-[0.1em]">Job Status</label>
            <div className="flex bg-cream border border-line p-[3px] rounded-[6px] text-[11px] h-[34px]">
              {(["ALL", "Active", "Non-Active"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex-1 text-center rounded-[4px] font-bold tracking-wide transition-all cursor-pointer ${
                    statusFilter === s
                      ? "bg-navy text-white shadow-sm"
                      : "text-ink-muted hover:text-navy hover:bg-white/60"
                  }`}
                >
                  {s === "ALL" ? "All" : s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results summary bar */}
        <div className="px-6 py-2 bg-cream/50 border-t border-line/50 flex items-center justify-between">
          <span className="text-[11px] text-ink-muted">
            Showing{" "}
            <strong className="text-navy font-bold">{filteredClients.length}</strong>{" "}
            of{" "}
            <strong className="text-navy font-bold">{initialClients.length}</strong>{" "}
            clients
          </span>
          {hasActiveFilters && (
            <span className="inline-flex items-center gap-1 font-mono text-[9.5px] bg-red-soft px-2 py-0.5 rounded-full text-red-deep font-bold border border-red/10">
              <span className="w-1.5 h-1.5 rounded-full bg-red inline-block" />
              Filters active
            </span>
          )}
        </div>
      </div>


      {/* Clients list */}
      {filteredClients.length === 0 ? (
        <div className="p-12 text-center text-ink-muted">
          <div className="text-3xl mb-3">📂</div>
          <p className="font-semibold">No matching clients found</p>
          <p className="text-xs mt-1">Try adjusting your search terms or filters.</p>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {filteredClients.map((client) => {
            const isExpanded = !!expandedClients[client.id];
            const hasLocations = client.locations.length > 0;

            return (
              <div
                key={client.id}
                style={{ scrollMarginTop: "200px" }}
                className={`transition-all ${isExpanded ? "bg-[#fafaf9]" : "bg-white"}`}
              >
                {/* Client Main Row */}
                <div
                  onClick={() => toggleClient(client.id)}
                  className="px-6 py-4.5 flex items-center justify-between gap-4 cursor-pointer hover:bg-cream/40 transition-all select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="font-mono text-xs font-bold text-ink-faint px-2 py-1 bg-cream border border-line rounded">
                      {client.id}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-heading font-bold text-navy text-base tracking-tight truncate hover:text-red transition-all">
                        {client.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-full ${client.type === "Corporate"
                              ? "bg-navy-soft/10 text-navy-soft"
                              : "bg-red-soft text-red-deep"
                            }`}
                        >
                          {client.type}
                        </span>
                        {client.canonicalNameKey && (
                          <span className="text-[9.5px] font-mono text-ink-faint hidden sm:inline">
                            key: {client.canonicalNameKey}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* CRUD Actions on Client */}
                    {isWritable && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleOpenEditClient(client, e)}
                          title="Edit Client"
                          className="w-7 h-7 bg-white hover:bg-cream border border-line hover:border-line-strong rounded flex items-center justify-center text-xs transition-all cursor-pointer"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => handleOpenDeleteClient(client, e)}
                          title="Delete Client"
                          className="w-7 h-7 bg-white hover:bg-red-soft border border-line hover:border-red/20 rounded flex items-center justify-center text-xs transition-all cursor-pointer text-red"
                        >
                          🗑️
                        </button>
                      </div>
                    )}

                    {/* Counters */}
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-ink-muted bg-cream border border-line px-2 py-1 rounded-[5px] flex items-center gap-1">
                        📍 <strong>{client.locations.length}</strong> locs
                      </span>
                      <span className="text-[10px] font-semibold text-ink-muted bg-cream border border-line px-2 py-1 rounded-[5px] flex items-center gap-1">
                        💼 <strong>{client.jobs.length}</strong> jobs
                      </span>
                    </div>

                    {/* Expand Arrow */}
                    <div
                      className={`w-7 h-7 rounded-full border border-line flex items-center justify-center text-[10px] text-ink-muted bg-white transition-all shadow-sm ${isExpanded ? "rotate-180 border-navy text-navy font-bold" : ""
                        }`}
                    >
                      ▼
                    </div>
                  </div>
                </div>

                {/* Expanded Client Details Panel */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-1 border-t border-line/45 animate-fade-in bg-cream/25">
                    {/* Action Header inside Client expanded view */}
                    <div className="flex items-center justify-between gap-4 mb-4 mt-2">
                      <div className="text-[10.5px] uppercase font-bold text-ink-muted tracking-wider">
                        Installation Sites & Portfolio Details
                      </div>
                      {isWritable && (
                        <button
                          onClick={() => handleOpenCreateLocation(client.id)}
                          className="px-2.5 py-1 bg-navy hover:bg-navy-soft text-white font-bold text-[10.5px] uppercase tracking-wider rounded transition-all cursor-pointer"
                        >
                          + Add Location
                        </button>
                      )}
                    </div>

                    {!hasLocations ? (
                      <div className="bg-white border border-line rounded-[var(--radius)] p-6 text-center text-ink-faint text-xs">
                        ⚠️ No locations or installation sites registered for this client.
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {client.locations.map((loc) => {
                          // Apply local filter inside expanded view too for beautiful cohesion
                          const locationJobs = client.jobs.filter((j) => {
                            if (j.locationId !== loc.id) return false;
                            if (saleTypeFilter !== "ALL" && j.saleType !== saleTypeFilter) return false;
                            if (statusFilter !== "ALL") {
                              const status = getJobStatus(j);
                              return status.isActive === (statusFilter === "Active");
                            }
                            return true;
                          });

                          return (
                            <div
                              key={loc.id}
                              className="bg-white border border-line rounded-[var(--radius)] overflow-hidden shadow-sm hover:shadow-card transition-all"
                            >
                              {/* Location Header */}
                              <div className="bg-cream/45 px-4.5 py-3 border-b border-line flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                  <span className="text-base select-none mt-0.5">📍</span>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-heading font-bold text-navy text-sm hover:text-red transition-all cursor-pointer">
                                        {loc.name}
                                      </span>
                                      <span className="font-mono text-[9.5px] text-ink-faint font-semibold bg-white border border-line px-1.5 py-0.2 rounded">
                                        {loc.id}
                                      </span>
                                    </div>
                                    {/* Address Display */}
                                    <div className="mt-1 flex flex-col sm:flex-row gap-x-6 gap-y-1 text-xs text-ink-muted">
                                      {loc.installationAddress && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] text-ink-faint">🏢 Install:</span>
                                          <span>{loc.installationAddress}</span>
                                        </div>
                                      )}
                                      {loc.billingAddress && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] text-ink-faint">✉️ Billing:</span>
                                          <span>{loc.billingAddress}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Location Actions */}
                                <div className="flex items-center gap-2 self-start md:self-auto">
                                  {isWritable && (
                                    <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-line">
                                      <button
                                        onClick={(e) => handleOpenEditLocation(loc, e)}
                                        title="Edit Location"
                                        className="w-6 h-6 hover:bg-cream rounded flex items-center justify-center text-[10px] transition-all cursor-pointer"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={(e) => handleOpenDeleteLocation(loc, e)}
                                        title="Delete Location"
                                        className="w-6 h-6 hover:bg-red-soft rounded flex items-center justify-center text-[10px] text-red transition-all cursor-pointer"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  )}
                                  {isWritable && (
                                    <button
                                      onClick={() => handleOpenCreateJob(client.id, loc.id)}
                                      className="px-2 py-1 bg-active-dot hover:bg-active-dot/90 text-white font-bold text-[9.5px] uppercase tracking-wider rounded cursor-pointer"
                                    >
                                      + Log Job
                                    </button>
                                  )}
                                  <span className="text-[10px] font-bold text-ink-muted bg-white border border-line px-2 py-1 rounded">
                                    {locationJobs.length} {locationJobs.length === 1 ? "Job" : "Jobs"}
                                  </span>
                                </div>
                              </div>

                              {/* Jobs List at Location */}
                              <div className="p-4 bg-white">
                                {locationJobs.length === 0 ? (
                                  <p className="text-xs text-ink-faint italic py-2">
                                    No matching jobs logged under this installation site.
                                  </p>
                                ) : (
                                  <div className="space-y-4">
                                    {locationJobs.map((job) => {
                                      const status = getJobStatus(job);

                                      return (
                                        <div
                                          key={job.id}
                                          className="border border-line/60 rounded-[var(--radius)] p-4 hover:border-line transition-all space-y-3 bg-[#fafaf9]/15 relative"
                                        >
                                          {/* Job Sub-Header */}
                                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/35 pb-2">
                                            <div className="flex items-center gap-2">
                                              <span className="font-mono text-[11px] font-bold text-navy-soft hover:underline cursor-pointer">
                                                {job.id}
                                              </span>
                                              {job.jobNo && (
                                                <span className="text-[10px] font-mono bg-cream border border-line px-1.5 py-0.2 rounded text-ink-muted">
                                                  Ref: {job.jobNo}
                                                </span>
                                              )}
                                              {job.system && (
                                                <span className="text-xs font-semibold text-navy">
                                                  • {job.system}
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                              {/* Sale Type Badge */}
                                              <span
                                                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${job.saleType === "OUTRIGHT"
                                                    ? "bg-sale-outright-bg text-sale-outright-fg"
                                                    : job.saleType === "RENTAL"
                                                      ? "bg-sale-rental-bg text-sale-rental-fg"
                                                      : job.saleType === "AMC"
                                                        ? "bg-sale-amc-bg text-sale-amc-fg"
                                                        : "bg-sale-nhw-bg text-sale-nhw-fg"
                                                  }`}
                                              >
                                                {job.saleType}
                                              </span>

                                              {/* Computed Status Badge */}
                                              <span
                                                className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${status.isActive
                                                    ? "bg-active-bg text-active-fg border-active-dot/10"
                                                    : "bg-inactive-bg text-inactive-fg border-inactive-dot/10"
                                                  }`}
                                              >
                                                <span className={`w-1.5 h-1.5 rounded-full ${status.isActive ? "bg-active-dot" : "bg-inactive-dot"}`} />
                                                {status.label}
                                              </span>

                                              {/* Job CRUD Actions */}
                                              {isWritable && (
                                                <div className="flex items-center gap-1 ml-1 bg-white p-0.5 rounded border border-line shadow-sm">
                                                  <button
                                                    onClick={(e) => handleOpenEditJob(job, e)}
                                                    title="Edit Job"
                                                    className="w-5 h-5 hover:bg-cream rounded flex items-center justify-center text-[9px] cursor-pointer"
                                                  >
                                                    ✏️
                                                  </button>
                                                  <button
                                                    onClick={(e) => handleOpenDeleteJob(job, e)}
                                                    title="Delete Job"
                                                    className="w-5 h-5 hover:bg-red-soft rounded flex items-center justify-center text-[9px] text-red cursor-pointer"
                                                  >
                                                    🗑️
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Job Details Fields Grid */}
                                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                            {/* Transaction Specs */}
                                            {job.saleType === "OUTRIGHT" ? (
                                              <>
                                                <div className="space-y-0.5">
                                                  <div className="text-[10px] text-ink-faint">Outright Value</div>
                                                  <div className="font-bold text-navy">
                                                    {job.outrightValue
                                                      ? `LKR ${job.outrightValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                      : "N/A"}
                                                  </div>
                                                </div>
                                                <div className="space-y-0.5">
                                                  <div className="text-[10px] text-ink-faint">Warranty Period</div>
                                                  <div className="font-semibold text-ink">
                                                    {job.warrantyMonths !== null ? `${job.warrantyMonths} Months` : "N/A"}
                                                  </div>
                                                </div>
                                                <div className="space-y-0.5">
                                                  <div className="text-[10px] text-ink-faint">Warranty End</div>
                                                  <div className="font-semibold text-ink">
                                                    {job.warrantyEnd ? job.warrantyEnd : "N/A"}
                                                  </div>
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <div className="space-y-0.5">
                                                  <div className="text-[10px] text-ink-faint">Agreement No</div>
                                                  <div className="font-bold text-navy">
                                                    {job.agreementNo || "N/A"}
                                                  </div>
                                                </div>
                                                <div className="space-y-0.5">
                                                  <div className="text-[10px] text-ink-faint">Rental Amount</div>
                                                  <div className="font-semibold text-ink">
                                                    {job.rentalAmount
                                                      ? `LKR ${job.rentalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mo`
                                                      : "N/A"}
                                                  </div>
                                                </div>
                                                <div className="space-y-0.5">
                                                  <div className="text-[10px] text-ink-faint">Agreement Period</div>
                                                  <div className="font-semibold text-ink text-[11px] leading-tight">
                                                    {job.agreementStart ? job.agreementStart : "Start N/A"}
                                                    <span className="text-ink-faint font-normal block text-[9.5px]">
                                                      to {job.agreementEnd ? job.agreementEnd : "End N/A"}
                                                    </span>
                                                  </div>
                                                </div>
                                              </>
                                            )}

                                            {/* Invoicing Specs */}
                                            <div className="space-y-0.5">
                                              <div className="text-[10px] text-ink-faint">Invoice Ref</div>
                                              <div className="font-semibold text-ink">
                                                {job.invoiceNo || "N/A"}
                                                {job.invoiceDate && (
                                                  <span className="text-[9.5px] text-ink-faint block font-normal">
                                                    Dated: {job.invoiceDate}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            {/* Contacts */}
                                            <div className="space-y-0.5">
                                              <div className="text-[10px] text-ink-faint">Contact Person</div>
                                              <div className="font-semibold text-ink">
                                                {job.contactPerson || "N/A"}
                                                {job.contactNumber && (
                                                  <span className="text-[9.5px] text-ink-muted block select-text">
                                                    📞 {job.contactNumber}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="space-y-0.5">
                                              <div className="text-[10px] text-ink-faint">Business Development (BDE)</div>
                                              <div className="font-semibold text-navy-soft">
                                                {job.bde || "N/A"}
                                              </div>
                                            </div>

                                            <div className="space-y-0.5">
                                              <div className="text-[10px] text-ink-faint">Creator Session</div>
                                              <div className="font-mono text-[9px] text-ink-muted">
                                                {job.createdBy || "System Import"}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DYNAMIC FORM MODAL (CREATE / EDIT CLIENT, LOCATION, JOB)    */}
      {/* ============================================================== */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[var(--radius)] border border-line shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">

            {/* Modal Title bar */}
            <div className="px-6 py-4.5 border-b border-line bg-cream/45 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-heading font-bold text-navy text-base uppercase tracking-tight">
                {modalConfig.mode === "create" ? "Add New" : "Edit"} {modalConfig.target}
              </h3>
              <button
                type="button"
                onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                className="text-ink-muted hover:text-ink text-sm font-bold w-8 h-8 rounded-full border border-line flex items-center justify-center bg-white shadow-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4.5 flex-grow">

              {/* TARGET: CLIENT FORM */}
              {modalConfig.target === "client" && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-navy">Client ID</label>
                    <input
                      type="text"
                      required
                      placeholder="CLI-XXXXX-U"
                      value={clientIdField}
                      onChange={(e) => setClientIdField(e.target.value)}
                      disabled={modalConfig.mode === "edit"}
                      className="w-full bg-cream/30 border border-line rounded px-3 py-2 text-sm outline-none focus:border-navy disabled:bg-cream disabled:text-ink-faint font-mono"
                    />
                    <p className="text-[10px] text-ink-faint">Automatically increments next ID. User-added records require the `-U` suffix.</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-navy">Client Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Cargills Retail, KFC, residence names"
                      value={clientNameField}
                      onChange={(e) => setClientNameField(e.target.value)}
                      className="w-full bg-cream/30 border border-line rounded px-3 py-2 text-sm outline-none focus:border-navy"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-navy">Client Type</label>
                    <select
                      value={clientTypeField}
                      onChange={(e) => setClientTypeField(e.target.value)}
                      className="w-full bg-cream/30 border border-line rounded px-3 py-2 text-sm outline-none focus:border-navy cursor-pointer"
                    >
                      <option value="Corporate">Corporate</option>
                      <option value="Residence">Residence</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TARGET: LOCATION FORM */}
              {modalConfig.target === "location" && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-navy">Parent Client ID</label>
                    <input
                      type="text"
                      disabled
                      value={locationClientIdField}
                      className="w-full bg-cream border border-line rounded px-3 py-2 text-sm text-ink-faint font-mono outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-navy">Location ID</label>
                    <input
                      type="text"
                      required
                      placeholder="LOC-XXXXXX-U"
                      value={locationIdField}
                      onChange={(e) => setLocationIdField(e.target.value)}
                      disabled={modalConfig.mode === "edit"}
                      className="w-full bg-cream/30 border border-line rounded px-3 py-2 text-sm outline-none focus:border-navy disabled:bg-cream disabled:text-ink-faint font-mono"
                    />
                    <p className="text-[10px] text-ink-faint">User-added location sites require the `-U` suffix.</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-navy">Location/Site Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. FC Ambathale, KFC Wattala"
                      value={locationNameField}
                      onChange={(e) => setLocationNameField(e.target.value)}
                      className="w-full bg-cream/30 border border-line rounded px-3 py-2 text-sm outline-none focus:border-navy"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-navy">Installation Address (Optional)</label>
                    <input
                      type="text"
                      placeholder="Full site physical address"
                      value={locationInstallAddrField}
                      onChange={(e) => setLocationInstallAddrField(e.target.value)}
                      className="w-full bg-cream/30 border border-line rounded px-3 py-2 text-sm outline-none focus:border-navy"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-navy">Billing Address (Optional)</label>
                    <input
                      type="text"
                      placeholder="Corporate or primary billing address"
                      value={locationBillingAddrField}
                      onChange={(e) => setLocationBillingAddrField(e.target.value)}
                      className="w-full bg-cream/30 border border-line rounded px-3 py-2 text-sm outline-none focus:border-navy"
                    />
                  </div>
                </div>
              )}

              {/* TARGET: JOB FORM */}
              {modalConfig.target === "job" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-navy">Parent Client ID</label>
                      <input
                        type="text"
                        disabled
                        value={jobClientIdField}
                        className="w-full bg-cream border border-line rounded px-3 py-1.5 text-xs text-ink-faint font-mono outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-navy">Parent Location ID</label>
                      <input
                        type="text"
                        disabled
                        value={jobLocationIdField}
                        className="w-full bg-cream border border-line rounded px-3 py-1.5 text-xs text-ink-faint font-mono outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-navy">Job ID</label>
                      <input
                        type="text"
                        required
                        placeholder="JOB-XXXXXX-U"
                        value={jobIdField}
                        onChange={(e) => setJobIdField(e.target.value)}
                        disabled={modalConfig.mode === "edit"}
                        className="w-full bg-cream/30 border border-line rounded px-3 py-1.5 text-xs outline-none focus:border-navy disabled:bg-cream disabled:text-ink-faint font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-navy">Ref/Business Job No</label>
                      <input
                        type="text"
                        placeholder="e.g. JOB/24/0012"
                        value={jobNoField}
                        onChange={(e) => setJobNoField(e.target.value)}
                        className="w-full bg-cream/30 border border-line rounded px-3 py-1.5 text-xs outline-none focus:border-navy"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-navy">Sale Type</label>
                      <select
                        value={jobSaleTypeField}
                        onChange={(e) => setJobSaleTypeField(e.target.value)}
                        className="w-full bg-cream/30 border border-line rounded px-3 py-1.5 text-xs outline-none focus:border-navy cursor-pointer"
                      >
                        <option value="OUTRIGHT">OUTRIGHT</option>
                        <option value="RENTAL">RENTAL</option>
                        <option value="AMC">AMC</option>
                        <option value="NHW">NHW</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-navy">System/Technology</label>
                      <input
                        type="text"
                        placeholder="e.g. CCTV, Access Control"
                        value={jobSystemField}
                        onChange={(e) => setJobSystemField(e.target.value)}
                        className="w-full bg-cream/30 border border-line rounded px-3 py-1.5 text-xs outline-none focus:border-navy"
                      />
                    </div>
                  </div>

                  {/* Dynamic Fields depending on Sale Type */}
                  {jobSaleTypeField === "OUTRIGHT" ? (
                    <div className="bg-[#fafaf9] border border-line p-4 rounded-[var(--radius)] space-y-3">
                      <div className="text-[10px] uppercase font-bold text-navy tracking-wider">
                        Outright Transaction Details
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10.5px] text-ink-muted">Value (LKR)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={jobOutrightValueField}
                            onChange={(e) => setJobOutrightValueField(e.target.value)}
                            className="bg-white border border-line rounded px-2.5 py-1 text-xs outline-none focus:border-navy"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10.5px] text-ink-muted">Warranty Months</label>
                          <input
                            type="number"
                            placeholder="Months"
                            value={jobWarrantyMonthsField}
                            onChange={(e) => setJobWarrantyMonthsField(e.target.value)}
                            className="bg-white border border-line rounded px-2.5 py-1 text-xs outline-none focus:border-navy"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10.5px] text-ink-muted">Warranty End</label>
                          <input
                            type="date"
                            value={jobWarrantyEndField}
                            onChange={(e) => setJobWarrantyEndField(e.target.value)}
                            className="bg-white border border-line rounded px-2 py-1 text-xs outline-none focus:border-navy cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#fafaf9] border border-line p-4 rounded-[var(--radius)] space-y-3">
                      <div className="text-[10px] uppercase font-bold text-navy tracking-wider">
                        Agreement & Recurring details
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10.5px] text-ink-muted">Agreement No</label>
                          <input
                            type="text"
                            placeholder="e.g. AG-40291"
                            value={jobAgreementNoField}
                            onChange={(e) => setJobAgreementNoField(e.target.value)}
                            className="bg-white border border-line rounded px-2.5 py-1.5 text-xs outline-none focus:border-navy"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10.5px] text-ink-muted">Monthly Rental (LKR)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={jobRentalAmountField}
                            onChange={(e) => setJobRentalAmountField(e.target.value)}
                            className="bg-white border border-line rounded px-2.5 py-1.5 text-xs outline-none focus:border-navy"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10.5px] text-ink-muted">Agreement Start</label>
                          <input
                            type="date"
                            value={jobAgreementStartField}
                            onChange={(e) => setJobAgreementStartField(e.target.value)}
                            className="bg-white border border-line rounded px-2 py-1 text-xs outline-none focus:border-navy cursor-pointer"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10.5px] text-ink-muted">Agreement End</label>
                          <input
                            type="date"
                            value={jobAgreementEndField}
                            onChange={(e) => setJobAgreementEndField(e.target.value)}
                            className="bg-white border border-line rounded px-2 py-1 text-xs outline-none focus:border-navy cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* General Invoicing and BDE Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-navy">Invoice Number</label>
                      <input
                        type="text"
                        placeholder="Invoice ref if issued"
                        value={jobInvoiceNoField}
                        onChange={(e) => setJobInvoiceNoField(e.target.value)}
                        className="w-full bg-cream/30 border border-line rounded px-3 py-1.5 text-xs outline-none focus:border-navy"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-navy">Invoice Date</label>
                      <input
                        type="date"
                        value={jobInvoiceDateField}
                        onChange={(e) => setJobInvoiceDateField(e.target.value)}
                        className="w-full bg-cream/30 border border-line rounded px-3 py-1 text-xs outline-none focus:border-navy cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Contact Personnel Info */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-navy">Contact Person</label>
                      <input
                        type="text"
                        placeholder="Name"
                        value={jobContactPersonField}
                        onChange={(e) => setJobContactPersonField(e.target.value)}
                        className="w-full bg-cream/30 border border-line rounded px-3 py-1.5 text-xs outline-none focus:border-navy"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-navy">Contact Phone</label>
                      <input
                        type="text"
                        placeholder="Phone No"
                        value={jobContactNumberField}
                        onChange={(e) => setJobContactNumberField(e.target.value)}
                        className="w-full bg-cream/30 border border-line rounded px-3 py-1.5 text-xs outline-none focus:border-navy"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-navy">Sales (BDE)</label>
                      <input
                        type="text"
                        placeholder="Executive Name"
                        value={jobBdeField}
                        onChange={(e) => setJobBdeField(e.target.value)}
                        className="w-full bg-cream/30 border border-line rounded px-3 py-1.5 text-xs outline-none focus:border-navy"
                      />
                    </div>
                  </div>

                  {/* Override Option */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-navy">Status Override (Optional)</label>
                    <select
                      value={jobStatusOverrideField}
                      onChange={(e) => setJobStatusOverrideField(e.target.value)}
                      className="w-full bg-cream/30 border border-line rounded px-3 py-1.5 text-xs outline-none focus:border-navy cursor-pointer"
                    >
                      <option value="">Default (Computed Status)</option>
                      <option value="Active">Override to Active</option>
                      <option value="Non-Active">Override to Non-Active</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-line mt-6">
                <button
                  type="button"
                  onClick={() => setModalConfig({ ...modalConfig, isOpen: false })}
                  className="px-4 py-2 border border-line hover:bg-cream rounded text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-navy hover:bg-navy-soft text-white rounded text-xs uppercase tracking-wider font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : modalConfig.mode === "create" ? "Create Record" : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. DELETION CONFIRMATION DIALOG MODAL                          */}
      {/* ============================================================== */}
      {deleteConfirm && deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[var(--radius)] border border-line shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="text-3xl text-red">⚠️</div>
              <h3 className="font-heading font-bold text-navy text-lg leading-tight">
                Confirm Deletion
              </h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Are you absolutely sure you want to delete this {deleteConfirm.target}? This action is irreversible.
                <br />
                <span className="font-bold text-ink block mt-2 p-3 bg-red-soft/40 border border-red/10 rounded font-mono text-xs text-red-deep">
                  {deleteConfirm.label}
                </span>
              </p>
            </div>

            <div className="px-6 py-4.5 bg-cream/45 border-t border-line flex justify-end gap-3.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-line hover:bg-cream rounded text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeleteAction}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red hover:bg-red-deep text-white rounded text-xs uppercase tracking-wider font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
