"use client";

import { useActionState, startTransition, useState } from "react";
import { loginUser } from "@/app/actions/authActions";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginUser, null);
  const [showCredsInfo, setShowCredsInfo] = useState(true);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fade-in">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center justify-center leading-none text-center select-none bg-navy text-white px-6 py-4 rounded-[var(--radius)] shadow-card border-b-[3px] border-red">
            <span className="font-heading font-bold text-2xl tracking-tight">GCL — KJE</span>
            <span className="text-[9.5px] tracking-[0.14em] uppercase text-white/55 mt-1.5 font-mono">
              General Client List
            </span>
          </div>
          <h2 className="mt-8 text-center text-3xl font-heading font-extrabold text-navy tracking-tight">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-xs text-ink-muted">
            Secure client database management portal
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-paper py-8 px-4 border border-line rounded-[var(--radius)] shadow-card sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {state?.error && (
              <div className="bg-red-soft border-l-4 border-red p-3.5 rounded-[5px] text-xs text-red-deep font-semibold">
                {state.error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-ink-muted">
                Email Address
              </label>
              <div className="mt-1.5">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@gcl-kje.com"
                  className="appearance-none block w-full px-3.5 py-2.5 border border-line rounded-[var(--radius)] shadow-inner placeholder-ink-faint focus:outline-none focus:ring-[1.5px] focus:ring-navy focus:border-navy text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-ink-muted">
                Password
              </label>
              <div className="mt-1.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="appearance-none block w-full px-3.5 py-2.5 border border-line rounded-[var(--radius)] shadow-inner placeholder-ink-faint focus:outline-none focus:ring-[1.5px] focus:ring-navy focus:border-navy text-sm font-medium"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-[var(--radius)] shadow-md text-xs uppercase tracking-widest font-bold text-white bg-navy hover:bg-navy-soft focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy disabled:opacity-50 transition-all cursor-pointer hover:-translate-y-[1px] active:translate-y-0"
              >
                {isPending ? "Signing in..." : "Sign In"}
              </button>
            </div>
          </form>

          {/* First load information panel */}
          {showCredsInfo && (
            <div className="mt-8 border-t border-line pt-6 relative animate-slide-up">
              <button
                onClick={() => setShowCredsInfo(false)}
                className="absolute right-0 top-6 text-ink-faint hover:text-ink text-xs font-bold"
                type="button"
              >
                ✕ Close
              </button>
              <div className="bg-active-bg/50 border border-active-dot/20 rounded-[var(--radius)] p-4 text-xs">
                <h4 className="font-bold text-active-fg flex items-center gap-1.5 mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-active-dot animate-ping" />
                  First Time Seeding Mode Active
                </h4>
                <p className="text-ink-muted leading-relaxed">
                  If the database contains no users, logging in with any email will automatically generate the default Admin credentials below:
                </p>
                <div className="mt-3 bg-paper border border-line rounded-[5px] p-2.5 space-y-1 font-mono text-[11px] text-navy">
                  <div>
                    <strong className="text-ink-muted">Email:</strong> admin@gcl-kje.com
                  </div>
                  <div>
                    <strong className="text-ink-muted">Password:</strong> Admin@12345
                  </div>
                  <div>
                    <strong className="text-ink-muted">Role:</strong> ADMIN
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
