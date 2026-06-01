import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { registerNewUser } from "@/app/actions/authActions";
import Link from "next/link";
import { redirect } from "next/navigation";
import UserForm from "./UserForm";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  // 1. Double check authentication and role safety on server-side
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/?error=unauthorized");
  }

  // 2. Fetch all system users
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <>
      {/* Header */}
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
          <div className="text-xs text-white/70">
            Logged in as <strong className="text-white font-semibold">{currentUser.name}</strong> ({currentUser.role})
          </div>
          <Link
            href="/clients"
            className="text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-[var(--radius)] transition-all no-underline"
          >
            ← Back to Clients
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="p-7 pb-16 max-w-7xl mx-auto w-full animate-fade-in">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-heading font-bold text-[32px] tracking-tight text-navy leading-tight">
              User Management
            </h1>
            <p className="mt-1.5 text-ink-muted text-sm">
              Control authentication, roles, and write permissions for the GCL platform.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User List Table */}
          <div className="lg:col-span-2 bg-paper border border-line rounded-[var(--radius)] shadow-card overflow-hidden">
            <div className="px-6 py-4 border-b border-line bg-cream/30">
              <h3 className="font-heading font-semibold text-navy text-[15px]">
                Registered Users ({users.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line text-[11px] tracking-wider uppercase font-bold text-ink-muted bg-cream/15">
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-cream/10 transition-colors text-sm">
                      <td className="px-6 py-4 font-semibold text-navy">{user.name}</td>
                      <td className="px-6 py-4 text-ink-muted font-mono text-xs">{user.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            user.role === "ADMIN"
                              ? "bg-red-soft text-red-deep border border-red/10"
                              : user.role === "EDITOR"
                                ? "bg-active-bg text-active-fg border border-active-dot/10"
                                : "bg-inactive-bg text-inactive-fg"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink-faint text-xs">
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add User Sidebar Form */}
          <div className="bg-paper border border-line rounded-[var(--radius)] shadow-card p-6 h-fit">
            <h3 className="font-heading font-bold text-navy text-lg tracking-tight mb-5 pb-3.5 border-b border-line">
              Add System User
            </h3>
            <UserForm registerNewUser={registerNewUser} />
          </div>
        </div>
      </main>
    </>
  );
}
