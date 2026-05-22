"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/reset/confirm`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo },
    );

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-wtva-dark-300 bg-wtva-card p-8">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="mt-2 text-sm text-wtva-muted">
          We will email you a link to set a new password.
        </p>

        {sent ? (
          <p className="mt-6 text-sm text-green-400">
            Check your inbox for the reset link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@demo.com"
              className="w-full rounded-lg border border-wtva-dark-300 bg-wtva-dark-400 px-4 py-2.5 text-sm outline-none focus:border-foreground"
            />
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/auth/login" className="text-wtva-muted underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
