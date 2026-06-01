"use client";

import { useActionState, startTransition, useRef } from "react";

interface UserFormProps {
  registerNewUser: (prevState: any, formData: FormData) => Promise<{ success: boolean; error?: string; message?: string }>;
}

export default function UserForm({ registerNewUser }: UserFormProps) {
  const [state, formAction, isPending] = useActionState(registerNewUser, null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await formAction(formData);
      // Reset form on success
      if (state && !state.error) {
        formRef.current?.reset();
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {state?.error && (
        <div className="bg-red-soft border-l-4 border-red p-3 rounded-[5px] text-xs text-red-deep font-semibold animate-fade-in">
          {state.error}
        </div>
      )}

      {state?.success && state?.message && (
        <div className="bg-active-bg border-l-4 border-active-dot p-3 rounded-[5px] text-xs text-active-fg font-semibold animate-fade-in">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="John Doe"
          className="mt-1 block w-full px-3.5 py-2 border border-line rounded-[var(--radius)] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-navy focus:border-navy"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="john@gcl-kje.com"
          className="mt-1 block w-full px-3.5 py-2 border border-line rounded-[var(--radius)] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-navy focus:border-navy font-mono"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          Initial Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="•••••••• (min 6 chars)"
          className="mt-1 block w-full px-3.5 py-2 border border-line rounded-[var(--radius)] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-navy focus:border-navy"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          System Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue="VIEWER"
          className="mt-1 block w-full px-3.5 py-2 border border-line rounded-[var(--radius)] text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-navy focus:border-navy text-navy bg-paper"
        >
          <option value="VIEWER">VIEWER (Read-Only)</option>
          <option value="EDITOR">EDITOR (Add/Edit Records)</option>
          <option value="ADMIN">ADMIN (Full Access & Sync)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-[var(--radius)] shadow-sm text-xs uppercase tracking-wider font-bold text-white bg-navy hover:bg-navy-soft focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy disabled:opacity-50 transition-all cursor-pointer mt-4"
      >
        {isPending ? "Creating User..." : "Register User"}
      </button>
    </form>
  );
}
