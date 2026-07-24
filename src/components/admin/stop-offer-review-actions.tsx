"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function StopOfferReviewActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: "approved" | "rejected") {
    setBusy(true);
    await fetch("/api/admin/night-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_stop_status", stopOfferId: id, status }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button className="px-3 py-1" disabled={busy} onClick={() => setStatus("approved")}>
        Approve
      </Button>
      <Button
        className="px-3 py-1"
        variant="secondary"
        disabled={busy}
        onClick={() => setStatus("rejected")}
      >
        Reject
      </Button>
    </div>
  );
}
