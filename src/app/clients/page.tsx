import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logoutUser } from "@/app/actions/authActions";
import Link from "next/link";
import ClientExplorer from "@/components/ClientExplorer";
import type { Client, Location, Job } from "@prisma/client";

type ClientWithRelations = Client & { locations: Location[]; jobs: Job[] };

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const currentUser = await getCurrentUser();
  const userName = currentUser?.name || "GUEST";
  const userRole = currentUser?.role || "VIEWER";

  // Fetch and serialize all clients, locations and jobs for the interactive explorer
  const dbClients: ClientWithRelations[] = await prisma.client.findMany({
    include: {
      locations: {
        orderBy: { id: "asc" },
      },
      jobs: {
        orderBy: { id: "asc" },
      },
    },
    orderBy: { id: "asc" },
  }).catch(() => [] as ClientWithRelations[]);

  const serializedClients = dbClients.map((client: ClientWithRelations) => ({
    ...client,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
    locations: client.locations.map((loc: Location) => ({
      ...loc,
      createdAt: loc.createdAt.toISOString(),
      updatedAt: loc.updatedAt.toISOString(),
    })),
    jobs: client.jobs.map((job: Job) => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      invoiceDate: job.invoiceDate ? job.invoiceDate.toISOString().split("T")[0] : null,
      warrantyEnd: job.warrantyEnd ? job.warrantyEnd.toISOString().split("T")[0] : null,
      agreementStart: job.agreementStart ? job.agreementStart.toISOString().split("T")[0] : null,
      agreementEnd: job.agreementEnd ? job.agreementEnd.toISOString().split("T")[0] : null,
      outrightValue: job.outrightValue ? Number(job.outrightValue) : null,
      rentalAmount: job.rentalAmount ? Number(job.rentalAmount) : null,
    })),
  }));

  return (
    <div className="h-screen bg-cream flex flex-col font-body overflow-hidden">
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

        {/* User Session Profile and Actions */}
        <div className="flex items-center gap-4">
          <div className="text-right flex flex-col items-end">
            <span className="text-xs font-bold text-white">{userName}</span>
            <span className="text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-full mt-1 tracking-wider bg-red-soft text-red-deep border border-red/10">
              {userRole}
            </span>
          </div>

          <div className="h-6 w-[1px] bg-white/20 mx-1" />

          {/* Navigation Links */}
          <div className="flex gap-2">
            <Link
              href="/"
              className="text-[11px] font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 rounded-[var(--radius)] transition-all no-underline"
            >
              ← Dashboard
            </Link>
            {userRole === "ADMIN" && (
              <>
                <Link
                  href="/sync"
                  className="text-[11px] font-bold uppercase tracking-wider bg-active-bg hover:bg-active-bg/90 text-active-fg px-3 py-1.5 rounded-[var(--radius)] transition-all no-underline"
                >
                  Sheets Sync
                </Link>
                <Link
                  href="/users"
                  className="text-[11px] font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-[var(--radius)] transition-all no-underline"
                >
                  Manage Users
                </Link>
              </>
            )}
          </div>

          <form action={logoutUser}>
            <button
              type="submit"
              className="text-[11px] font-bold uppercase tracking-wider bg-red hover:bg-red-deep text-white px-3 py-1.5 rounded-[var(--radius)] transition-all cursor-pointer shadow-sm font-semibold"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main content container */}
      <main className="flex-1 overflow-y-auto min-h-0 animate-slide-up">
        <div className="p-7 pb-16 max-w-7xl mx-auto w-full">
        <ClientExplorer initialClients={serializedClients} userRole={userRole} />
        </div>
      </main>
    </div>
  );
}
