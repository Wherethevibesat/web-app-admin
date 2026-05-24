"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { EventRow } from "@/lib/types/database";
import { TableCheckbox } from "@/components/ui/table-checkbox";

export function usePendingEventSelection(events: EventRow[]) {
  const pendingIds = useMemo(
    () => events.filter((e) => e.status === "pending_review").map((e) => e.id),
    [events],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(pendingIds) : new Set());
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const allPendingSelected =
    pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  return {
    pendingIds,
    selected,
    selectedCount: selected.size,
    allPendingSelected,
    toggleOne,
    toggleAll,
    clearSelection,
  };
}

type EventBulkApproveBarProps = {
  pendingCount: number;
  selectedCount: number;
  allPendingSelected: boolean;
  busy: boolean;
  onSelectAll: (checked: boolean) => void;
  onApprove: () => void;
  onClear: () => void;
};

export function EventBulkApproveBar({
  pendingCount,
  selectedCount,
  allPendingSelected,
  busy,
  onSelectAll,
  onApprove,
  onClear,
}: EventBulkApproveBarProps) {
  if (pendingCount === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-wtva-dark-300 bg-wtva-dark-400/50 px-4 py-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <TableCheckbox
          checked={allPendingSelected}
          onChange={(e) => onSelectAll(e.target.checked)}
        />
        Select all pending ({pendingCount})
      </label>
      {selectedCount > 0 && (
        <>
          <Button className="px-3 py-1 text-xs" disabled={busy} onClick={onApprove}>
            Approve selected ({selectedCount})
          </Button>
          <Button variant="ghost" className="px-3 py-1 text-xs" disabled={busy} onClick={onClear}>
            Clear
          </Button>
        </>
      )}
    </div>
  );
}

export function useBulkApproveEvents(onComplete?: () => void) {
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function approveSelected(ids: string[]) {
    if (ids.length === 0) return;

    const ok = await confirm({
      title: `Approve ${ids.length} event${ids.length === 1 ? "" : "s"}?`,
      description: "Selected events will be published and visible to customers.",
      confirmLabel: "Approve all",
      variant: "default",
    });
    if (!ok) return;

    setBusy(true);
    const res = await fetch("/api/admin/events/bulk-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status: "published" }),
    });
    setBusy(false);

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(body.error ?? "Bulk approve failed");
      return;
    }

    if (body.failed?.length) {
      alert(`Approved ${body.succeeded.length}. Failed: ${body.failed.length}.`);
    }

    onComplete?.();
    router.refresh();
  }

  return { busy, approveSelected };
}
