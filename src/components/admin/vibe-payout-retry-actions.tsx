"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function VibePayoutRetryActions({
  orderId,
  stopId,
}: {
  orderId?: string;
  stopId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/vibe-payouts/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, stopId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Retry failed");
        return;
      }
      setMessage(`Transferred ${data.transferred ?? 0} stop(s)`);
      router.refresh();
    } catch {
      setMessage("Retry failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        className="px-3 py-1.5 text-xs"
        disabled={busy}
        onClick={retry}
      >
        {busy ? "Retrying…" : "Retry transfer"}
      </Button>
      {message && <p className="text-xs text-wtva-muted">{message}</p>}
    </div>
  );
}
