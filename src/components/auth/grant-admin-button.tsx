"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GrantAdminButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/auth/grant-admin", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setMessage(body.error ?? "Something went wrong");
      return;
    }

    setMessage("Done! Opening dashboard…");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-full bg-accent-gradient shadow-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Fixing access…" : "Fix my admin access"}
      </button>
      {message && (
        <p className="text-sm text-wtva-muted">{message}</p>
      )}
    </div>
  );
}
