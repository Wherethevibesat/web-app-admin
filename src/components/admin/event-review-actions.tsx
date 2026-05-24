"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { EventReviewStatus } from "@/lib/admin/events";

type EventReviewActionsProps = {
  eventId: string;
  disabled?: boolean;
  compact?: boolean;
};

export function EventReviewActions({ eventId, disabled, compact }: EventReviewActionsProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!returnOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setReturnOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [returnOpen]);

  async function submitReview(status: EventReviewStatus, reviewNotes?: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/events/${eventId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes: reviewNotes }),
    });
    setBusy(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Review action failed");
      return;
    }

    setReturnOpen(false);
    setNotes("");
    router.refresh();
  }

  async function approve() {
    await submitReview("published");
  }

  async function reject() {
    const ok = await confirm({
      title: "Reject event?",
      description: "The venue owner will not be able to edit or resubmit this event.",
      confirmLabel: "Reject",
      variant: "danger",
    });
    if (ok) await submitReview("cancelled");
  }

  async function returnToSender() {
    await submitReview("draft", notes.trim() || undefined);
  }

  const btnClass = compact ? "px-2 py-1 text-xs" : "px-3 py-1 text-xs";

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button className={btnClass} disabled={disabled || busy} onClick={approve}>
          Approve
        </Button>
        <Button
          variant="ghost"
          className={btnClass}
          disabled={disabled || busy}
          onClick={() => setReturnOpen(true)}
        >
          Return
        </Button>
        <Button variant="danger" className={btnClass} disabled={disabled || busy} onClick={reject}>
          Reject
        </Button>
      </div>

      {returnOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close dialog"
            onClick={() => setReturnOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-event-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-wtva-dark-300 bg-wtva-card p-6 shadow-2xl"
          >
            <h2 id="return-event-title" className="text-lg font-semibold">
              Return to sender
            </h2>
            <p className="mt-2 text-sm text-wtva-muted">
              The event goes back to draft so the venue owner can edit and resubmit. Add optional
              notes for them.
            </p>
            <textarea
              className="mt-4 w-full rounded-lg border border-wtva-dark-300 bg-wtva-dark-200 px-3 py-2 text-sm"
              rows={4}
              placeholder="What needs to be updated? (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => setReturnOpen(false)}>
                Cancel
              </Button>
              <Button disabled={busy} onClick={returnToSender}>
                Return to sender
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
