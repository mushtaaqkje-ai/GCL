"use client";

import { useState, startTransition } from "react";
import { runExportAction, runImportAction } from "@/app/actions/sheetActions";
import Link from "next/link";

export default function SyncPage() {
  const [logs, setLogs] = useState<string[]>([
    "[System] Console ready. Establish a connection by running an Export or Import sync operation."
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showGuide, setShowGuide] = useState(true);

  const addLog = (text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${text}`]);
  };

  const handleExport = () => {
    if (isExporting || isImporting) return;
    setIsExporting(true);
    setSyncStatus("idle");
    setMessage("");
    addLog("Initializing Database Export...");
    addLog("Connecting to Google Sheets API v4 using Service Account credentials...");

    startTransition(async () => {
      const response = await runExportAction();
      setIsExporting(false);
      if (response.success) {
        setSyncStatus("success");
        setMessage(response.message || "Export complete.");
        addLog("Google Spreadsheet found. Target worksheets: Clients, Locations, Jobs.");
        addLog("Clearing stale sheets values...");
        addLog(`Database records successfully synchronized to Google Sheet.`);
        addLog(`Exported stats: ${response.result?.clientsExported} Clients, ${response.result?.locationsExported} Locations, ${response.result?.jobsExported} Jobs.`);
        addLog("[System] Sync Operation Completed Successfully.");
      } else {
        setSyncStatus("error");
        setMessage(response.error || "Export failed.");
        addLog(`[ERROR] Export failed: ${response.error}`);
        addLog("[System] Sync Operation Terminated with Errors.");
      }
    });
  };

  const handleImport = () => {
    if (isExporting || isImporting) return;
    setIsImporting(true);
    setSyncStatus("idle");
    setMessage("");
    addLog("Initializing Google Sheets Import...");
    addLog("Retrieving Clients, Locations, and Jobs worksheets...");

    startTransition(async () => {
      const response = await runImportAction();
      setIsImporting(false);
      if (response.success) {
        setSyncStatus("success");
        setMessage(response.message || "Import complete.");
        if (response.result?.logs) {
          response.result.logs.forEach((logLine: string) => {
            addLog(logLine);
          });
        }
        addLog("[System] Database Upsert Phase Finished.");
        addLog("[System] Sync Operation Completed Successfully.");
      } else {
        setSyncStatus("error");
        setMessage(response.error || "Import failed.");
        addLog(`[ERROR] Import failed: ${response.error}`);
        addLog("[System] Sync Operation Terminated with Errors.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col font-body">
      {/* Topbar */}
      <header className="bg-navy text-white px-7 py-3.5 flex items-center justify-between sticky top-0 z-50 border-b-[3px] border-red shadow-md">
        <Link href="/" className="flex items-center gap-3.5 cursor-pointer select-none no-underline text-white">
          <div className="flex flex-col leading-tight">
            <span className="font-heading font-bold text-lg tracking-tight">GCL — KJE</span>
            <span className="text-[11px] tracking-[0.12em] uppercase text-white/55 mt-0.5 font-mono">
              General Client List
            </span>
          </div>
        </Link>
        <div className="flex gap-4 items-center">
          <Link
            href="/clients"
            className="text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 rounded-[var(--radius)] transition-all no-underline"
          >
            ← Back to Clients
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="p-7 pb-16 max-w-6xl mx-auto w-full flex-grow animate-fade-in space-y-7">
        <div>
          <h1 className="font-heading font-bold text-[32px] tracking-tight text-navy leading-tight">
            Google Sheets Synchronizer
          </h1>
          <p className="mt-1.5 text-ink-muted text-sm">
            Admin Sync Hub. Push local database records to Google Sheets or import modifications seamlessly.
          </p>
        </div>

        {/* Status messages */}
        {syncStatus === "success" && (
          <div className="bg-active-bg border-l-4 border-active-dot p-4 rounded-[var(--radius)] text-sm text-active-fg font-semibold shadow-sm animate-fade-in">
            ✓ {message}
          </div>
        )}

        {syncStatus === "error" && (
          <div className="bg-red-soft border-l-4 border-red p-4 rounded-[var(--radius)] text-sm text-red-deep font-semibold shadow-sm animate-fade-in">
            ✕ Sync Failed: {message}
          </div>
        )}

        {/* Sync Controls grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card: Export */}
          <div className="bg-paper border border-line rounded-[var(--radius)] p-6 shadow-card hover:shadow-hover transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center text-navy font-bold text-lg mb-4">
                ↑
              </div>
              <h3 className="font-heading font-bold text-lg text-navy tracking-tight mb-2">
                Export DB to Google Sheet
              </h3>
              <p className="text-ink-muted text-xs leading-relaxed mb-6">
                Clears all old values on worksheets <strong>Clients</strong>, <strong>Locations</strong>, and <strong>Jobs</strong> in Google Sheets and overwrites them with current local database records. Excellent for data exports and reports.
              </p>
            </div>
            <button
              onClick={handleExport}
              disabled={isExporting || isImporting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-[var(--radius)] shadow-sm text-xs uppercase tracking-wider font-bold text-white bg-navy hover:bg-navy-soft focus:outline-none disabled:opacity-50 transition-all cursor-pointer hover:-translate-y-[1px] active:translate-y-0"
            >
              {isExporting ? "Exporting Database..." : "Run Database Export"}
            </button>
          </div>

          {/* Card: Import */}
          <div className="bg-paper border border-line rounded-[var(--radius)] p-6 shadow-card hover:shadow-hover transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-full bg-active-dot/10 flex items-center justify-center text-active-dot font-bold text-lg mb-4">
                ↓
              </div>
              <h3 className="font-heading font-bold text-lg text-navy tracking-tight mb-2">
                Import Sheet to DB
              </h3>
              <p className="text-ink-muted text-xs leading-relaxed mb-6">
                Pulls all records from your Google Sheet. It parses, validates, and performs database <strong>upserts</strong>. Order constraints are resolved automatically. Modified records will update and new rows will insert safely.
              </p>
            </div>
            <button
              onClick={handleImport}
              disabled={isExporting || isImporting}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-[var(--radius)] shadow-sm text-xs uppercase tracking-wider font-bold text-white bg-active-dot hover:bg-active-dot/95 focus:outline-none disabled:opacity-50 transition-all cursor-pointer hover:-translate-y-[1px] active:translate-y-0"
            >
              {isImporting ? "Importing Sheet..." : "Run Spreadsheet Import"}
            </button>
          </div>
        </div>

        {/* Real-time System Console */}
        <div className="bg-[#0b0f19] rounded-[var(--radius)] border border-[#1d273a] shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1d273a] bg-[#0c1220] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#5a6f94] ml-2">
                System Console Log
              </span>
            </div>
            {(isExporting || isImporting) && (
              <span className="text-[10.5px] font-semibold text-active-dot animate-pulse">
                SYNC IN PROGRESS...
              </span>
            )}
          </div>
          <div className="p-5 font-mono text-[11px] text-[#869cb8] leading-relaxed max-h-[300px] overflow-y-auto min-h-[160px] space-y-1.5 scrollbar-thin">
            {logs.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap">
                {log.includes("[ERROR]") ? (
                  <span className="text-red font-semibold">{log}</span>
                ) : log.includes("Successfully") || log.includes("[Client Sync]") || log.includes("[Location Sync]") || log.includes("[Job Sync]") ? (
                  <span className="text-green-400 font-semibold">{log}</span>
                ) : log.includes("[System]") ? (
                  <span className="text-blue-400 font-semibold">{log}</span>
                ) : (
                  log
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Setup Guide Panel */}
        <div className="bg-paper border border-line rounded-[var(--radius)] p-6 shadow-card">
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowGuide(!showGuide)}>
            <h3 className="font-heading font-bold text-[17px] text-navy tracking-tight flex items-center gap-2 select-none">
              ℹ Setup & Connection Guide
            </h3>
            <span className="text-ink-muted text-xs font-bold">{showGuide ? "▲ Collapse" : "▼ Expand"}</span>
          </div>

          {showGuide && (
            <div className="mt-5 border-t border-line pt-5 space-y-4 text-sm text-ink leading-relaxed">
              <div>
                <h4 className="font-bold text-navy mb-1.5">1. Get Google Service Account Credentials</h4>
                <p className="text-ink-muted text-xs">
                  Navigate to the <a href="https://console.cloud.google.com" target="_blank" className="text-red font-bold hover:underline">Google Cloud Console</a>. Create a project, enable the <strong>Google Sheets API</strong>, and navigate to <strong>IAM & Admin &gt; Service Accounts</strong>. Create a service account and export a <strong>JSON Private Key</strong>.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-navy mb-1.5">2. Share Google Sheet with Service Account</h4>
                <p className="text-ink-muted text-xs">
                  Copy the unique email of your service account (e.g. <code>sync-bot@your-project.iam.gserviceaccount.com</code>). Open your target Google Sheet and click <strong>Share</strong>. Paste the email and assign <strong>Editor</strong> permissions so the sync bot can read and write records!
                </p>
              </div>
              <div>
                <h4 className="font-bold text-navy mb-1.5">3. Configure Environment Variables</h4>
                <p className="text-ink-muted text-xs">
                  Open the <code>.env</code> file in your project root and configure these three environment variables:
                </p>
                <pre className="mt-2 bg-cream border border-line rounded-[5px] p-3 text-[11px] font-mono text-navy leading-normal overflow-x-auto">
                  GOOGLE_SERVICE_ACCOUNT_EMAIL="sync-bot@your-project.iam.gserviceaccount.com"{"\n"}
                  GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR\nPRIVATE\nKEY\n-----END PRIVATE KEY-----\n"{"\n"}
                  GOOGLE_SPREADSHEET_ID="YOUR_SPREADSHEET_ID_FROM_URL"
                </pre>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
