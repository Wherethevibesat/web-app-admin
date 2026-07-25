"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordConfirmPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-wtva-dark-300 bg-wtva-card p-8 shadow-card">
        <div className="mb-6 flex justify-center">
          <BrandLogo href="/auth/login" heightClass="h-12" />
        </div>
        <h1 className="text-2xl font-bold">Set new password</h1>
        <p className="mt-2 text-sm text-wtva-muted">
          Choose a new password for your admin account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-lg border border-wtva-dark-300 bg-wtva-card px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            className="w-full rounded-lg border border-wtva-dark-300 bg-wtva-card px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent-gradient py-2.5 text-sm font-semibold text-white shadow-accent disabled:opacity-50"
          >
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link href="/auth/login" className="text-wtva-muted underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
