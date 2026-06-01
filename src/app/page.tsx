import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logoutUser } from "@/app/actions/authActions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  // 1. Fetch current session
  const currentUser = await getCurrentUser();
  const userName = currentUser?.name || "GUEST";
  const userRole = currentUser?.role || "VIEWER";

  // 2. Fetch live metrics from DB
  const clientsCount = await prisma.client.count().catch(() => 0);
  const locationsCount = await prisma.location.count().catch(() => 0);
  const jobsCount = await prisma.job.count().catch(() => 0);

  // 3. Count active outright and agreements (simple count for presentation)
  const outrightCount = await prisma.job.count({ where: { saleType: "OUTRIGHT" } }).catch(() => 0);
  const rentalCount = await prisma.job.count({ where: { saleType: "RENTAL" } }).catch(() => 0);
  const amcCount = await prisma.job.count({ where: { saleType: "AMC" } }).catch(() => 0);
  const nhwCount = await prisma.job.count({ where: { saleType: "NHW" } }).catch(() => 0);

  return (
    <>
      {/* Topbar */}
      <header className="bg-navy text-white px-7 py-3.5 flex items-center justify-between sticky top-0 z-50 border-b-[3px] border-red shadow-md">
        <div className="flex items-center gap-3.5 cursor-pointer select-none">
          <div className="flex flex-col leading-tight">
            <span className="font-heading font-bold text-lg tracking-tight">
              GCL — KJE
            </span>
            <span className="text-[11px] tracking-[0.12em] uppercase text-white/55 mt-0.5 font-mono">
              General Client List
            </span>
          </div>
        </div>

        {/* Live Counters */}
        <div className="hidden lg:flex gap-6 items-center text-xs text-white/65 mr-auto ml-10">
          <div>
            <strong className="text-white font-semibold">{clientsCount.toLocaleString()}</strong> clients
          </div>
          <div>
            <strong className="text-white font-semibold">{locationsCount.toLocaleString()}</strong> locations
          </div>
          <div>
            <strong className="text-white font-semibold">{jobsCount.toLocaleString()}</strong> jobs
          </div>
        </div>

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
              href="/clients"
              className="text-[11px] font-bold uppercase tracking-wider bg-red hover:bg-red-deep text-white px-3.5 py-1.5 rounded-[var(--radius)] shadow-sm transition-all no-underline font-semibold"
            >
              Client Explorer
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
              className="text-[11px] font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-[var(--radius)] transition-all cursor-pointer font-semibold"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main className="p-7 pb-16 animate-fade-in max-w-7xl mx-auto w-full flex-grow flex flex-col justify-center">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="font-heading font-bold text-[32px] tracking-tight text-navy leading-tight">
              General Client List Dashboard
            </h1>
            <p className="mt-1.5 text-ink-muted text-sm leading-relaxed">
              Welcome back, <strong>{userName}</strong>. You are currently logged in with <strong>{userRole}</strong> permissions.
            </p>
          </div>
        </div>

        {/* Live Stat Tiles */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-8">
          {[
            { label: "Total Clients", value: clientsCount.toLocaleString(), sub: "Registered clients", color: "bg-navy" },
            { label: "Locations", value: locationsCount.toLocaleString(), sub: "Installation sites", color: "bg-active-dot" },
            { label: "Jobs Records", value: jobsCount.toLocaleString(), sub: "Total jobs logged", color: "bg-navy-soft" },
            { label: "Active Agreements", value: (rentalCount + amcCount + nhwCount).toLocaleString(), sub: "Rental / AMC / NHW", color: "bg-active-fg" },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-paper border border-line rounded-[var(--radius)] px-[18px] py-4.5 relative overflow-hidden shadow-card"
            >
              <div className={`absolute left-0 top-0 w-[4px] h-full ${stat.color}`} />
              <div className="text-[11px] tracking-[0.08em] uppercase text-ink-muted font-bold">
                {stat.label}
              </div>
              <div className="font-heading font-bold text-[28px] text-navy mt-1 tracking-tight">
                {stat.value}
              </div>
              <div className="text-[11px] text-ink-faint mt-0.5">
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Launch Client Explorer Callout */}
        <div className="bg-paper border border-line rounded-[var(--radius)] p-8 shadow-card flex flex-col items-center text-center space-y-4 max-w-2xl mx-auto my-6 w-full">
          <div className="w-16 h-16 rounded-full bg-navy/5 flex items-center justify-center text-3xl">
            📂
          </div>
          <div className="space-y-1.5">
            <h2 className="font-heading font-bold text-2xl text-navy tracking-tight">
              Launch Client List Explorer
            </h2>
            <p className="text-ink-muted text-sm max-w-md leading-relaxed">
              Drill down into clients, locations, and active warranties or agreements. Search, filter, and perform CRUD operations dynamically.
            </p>
          </div>
          <Link
            href="/clients"
            className="px-6 py-3.5 bg-navy hover:bg-navy-soft text-white font-bold text-xs uppercase tracking-wider rounded-[var(--radius)] shadow-lg hover:-translate-y-[1px] active:translate-y-0 transition-all no-underline cursor-pointer"
          >
            Launch Client Explorer →
          </Link>
        </div>

        {/* Sale Type breakdown badges and verified tokens */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="md:col-span-2 bg-paper border border-line rounded-[var(--radius)] p-6 space-y-4 shadow-card">
            <h3 className="font-heading font-bold text-navy text-lg tracking-tight">
              Sale Types Distribution
            </h3>
            <p className="text-ink-muted text-xs">
              Breakdown of registered business operations inside the database:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-sale-outright-bg/60 p-3 rounded-[5px] text-center border border-sale-outright-bg/25">
                <span className="font-mono text-[10px] font-bold text-sale-outright-fg">OUTRIGHT</span>
                <div className="font-heading font-bold text-navy text-xl mt-1">{outrightCount}</div>
              </div>
              <div className="bg-sale-rental-bg/60 p-3 rounded-[5px] text-center border border-sale-rental-bg/25">
                <span className="font-mono text-[10px] font-bold text-sale-rental-fg">RENTAL</span>
                <div className="font-heading font-bold text-navy text-xl mt-1">{rentalCount}</div>
              </div>
              <div className="bg-sale-amc-bg/60 p-3 rounded-[5px] text-center border border-sale-amc-bg/25">
                <span className="font-mono text-[10px] font-bold text-sale-amc-fg">AMC</span>
                <div className="font-heading font-bold text-navy text-xl mt-1">{amcCount}</div>
              </div>
              <div className="bg-sale-nhw-bg/60 p-3 rounded-[5px] text-center border border-sale-nhw-bg/25">
                <span className="font-mono text-[10px] font-bold text-sale-nhw-fg">NHW</span>
                <div className="font-heading font-bold text-navy text-xl mt-1">{nhwCount}</div>
              </div>
            </div>
          </div>

          <div className="bg-paper border border-line rounded-[var(--radius)] p-6 space-y-4 shadow-card flex flex-col justify-between">
            <div>
              <h3 className="font-heading font-bold text-navy text-lg tracking-tight mb-2">
                User Security Clearance
              </h3>
              <p className="text-ink-muted text-xs leading-relaxed">
                Your role determines which database commands you are allowed to execute:
              </p>
              <div className="mt-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-navy">Read Data</span>
                  <span className="text-green-500 font-bold">ALL ROLES</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-navy">Add/Edit Clients</span>
                  <span className="text-green-500 font-bold">EDITOR & ADMIN</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-navy">Sync Google Sheets</span>
                  <span className="text-red font-bold">ADMIN ONLY</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] font-mono text-ink-faint pt-4 border-t border-line">
              Active Session: {userName.substring(0, 12)}...
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
