"use server";

import { getCurrentUser } from "@/lib/auth";
import { exportToGoogleSheet, importFromGoogleSheet } from "@/lib/sheets";
import { revalidatePath } from "next/cache";

/**
 * Server Action to trigger database export to Google Sheet.
 * Restricts access to ADMIN role.
 */
export async function runExportAction() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized. Only administrators can export data." };
    }

    const result = await exportToGoogleSheet();
    return {
      success: true,
      message: `Successfully exported ${result.clientsExported} clients, ${result.locationsExported} locations, and ${result.jobsExported} jobs into Google Sheets!`,
      result,
    };
  } catch (error: any) {
    console.error("Export Action Error:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred during export. Check your service credentials in .env.",
    };
  }
}

/**
 * Server Action to trigger database import from Google Sheet.
 * Restricts access to ADMIN role.
 */
export async function runImportAction() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized. Only administrators can import data." };
    }

    const result = await importFromGoogleSheet(user.email);
    revalidatePath("/"); // revalidate client view pages
    return {
      success: true,
      message: `Successfully synchronized database! Added/Updated: ${result.clientsSynced} clients, ${result.locationsSynced} locations, ${result.jobsSynced} jobs.`,
      result,
    };
  } catch (error: any) {
    console.error("Import Action Error:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred during import. Check column names and Service Account permissions.",
    };
  }
}
