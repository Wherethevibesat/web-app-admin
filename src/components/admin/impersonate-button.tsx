"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ImpersonateButton({
  userId,
  label = "Open business portal",
  className,
}: {
  userId: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(body.error ?? "Could not open business portal");
        return;
      }
      if (typeof body.url === "string") {
        window.open(body.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className={className ?? "px-3 py-1 text-xs"}
      disabled={busy}
      onClick={handleClick}
    >
      {busy ? "Opening…" : label}
    </Button>
  );
}
