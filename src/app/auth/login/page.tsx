"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border border-wtva-dark-300 bg-wtva-card p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 rounded-xl bg-wtva-dark-300 p-3">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">WTVA Admin</h1>
          <p className="mt-2 text-sm text-wtva-muted">
            Sign in with an admin account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-wtva-dark-300 bg-wtva-dark-400 px-4 py-2.5 text-sm outline-none focus:border-foreground"
              placeholder="admin@demo.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-wtva-dark-300 bg-wtva-dark-400 px-4 py-2.5 text-sm outline-none focus:border-foreground"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-foreground py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-wtva-muted">
          <Link href="/auth/reset" className="underline hover:text-foreground">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}
