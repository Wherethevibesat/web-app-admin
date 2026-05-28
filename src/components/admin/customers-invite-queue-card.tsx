"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CustomerInviteQueueStats } from "@/lib/admin/customers";

export function CustomersInviteQueueCard({ stats }: { stats: CustomerInviteQueueStats }) {
  const router = useRouter();
  const [batchSize, setBatchSize] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportStopped() {
    setError(null);
    const res = await fetch("/api/admin/customers/export-stopped");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Export failed");
      return;
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] ?? "customer-invites-stopped.csv";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function sendInvites(sendAll = false, retryFailed = false) {
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/customers/send-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchSize: Number(batchSize) || 1000, sendAll, retryFailed }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Failed to send invites");
      return;
    }
    setMessage(`Processed ${body.processed ?? 0}. Invited ${body.invited ?? 0}. Failed ${body.failed ?? 0}.`);
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-xl border border-wtva-dark-300 bg-wtva-card p-5">
      <h2 className="text-lg font-semibold">Invite queue</h2>
      <p className="mt-1 text-sm text-wtva-muted">
        Send onboarding emails to pending imported customers in batches.
      </p>
      <p className="mt-1 text-xs text-wtva-muted">
        Delivery is automatically throttled in the backend for sender reputation safety.
      </p>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <div>Pending: {stats.pending_invite}</div>
        <div>Invited: {stats.invited}</div>
        <div>Activated: {stats.activated}</div>
        <div>Failed: {stats.failed}</div>
        <div>Retryable: {stats.retryable_failed}</div>
        <div>Unsubscribed: {stats.unsubscribed}</div>
      </div>
      {stats.max_attempts_reached > 0 && (
        <div className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
          <p>
            <span className="font-semibold">{stats.max_attempts_reached}</span> contact
            {stats.max_attempts_reached === 1 ? "" : "s"} stopped after {stats.maxAttempts} invite
            attempts — needs manual review.
          </p>
          <button
            type="button"
            onClick={exportStopped}
            className="mt-2 inline-flex items-center rounded-lg border border-amber-700/60 px-3 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-900/40"
          >
            Export stopped (CSV)
          </button>
        </div>
      )}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={2000}
          value={batchSize}
          onChange={(e) => setBatchSize(e.target.value)}
          className="w-28 rounded-lg border border-wtva-dark-300 bg-wtva-dark-400 px-3 py-2 text-sm"
        />
        <Button onClick={() => sendInvites(false)} disabled={busy || stats.pending_invite === 0}>
          {busy ? "Sending..." : "Send one batch"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => sendInvites(true)}
          disabled={busy || stats.pending_invite === 0}
        >
          {busy ? "Processing..." : "Send all pending"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => sendInvites(true, true)}
          disabled={busy || stats.retryable_failed === 0}
        >
          {busy ? "Processing..." : "Retry failed"}
        </Button>
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {message && <p className="mt-3 text-sm text-green-400">{message}</p>}
    </div>
  );
}
