"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type ConfirmOptions,
  useConfirm,
  useConfirmDelete,
} from "@/components/ui/confirm-dialog";

export function useBulkRequest(clearSelection?: () => void) {
  const router = useRouter();
  const confirm = useConfirm();
  const confirmDelete = useConfirmDelete();
  const [busy, setBusy] = useState(false);

  async function post(
    endpoint: string,
    body: Record<string, unknown>,
    options?: {
      confirm?: Omit<ConfirmOptions, "description"> & { description?: string };
      useDeleteConfirm?: boolean;
      itemName?: string;
    },
  ): Promise<boolean> {
    const ids = body.ids as string[] | undefined;
    const count = ids?.length ?? 0;
    if (count === 0) return false;

    if (options?.useDeleteConfirm) {
      const name = options.itemName ?? `${count} item${count === 1 ? "" : "s"}`;
      if (!(await confirmDelete(name))) return false;
    } else if (options?.confirm) {
      const confirmOpts: ConfirmOptions = {
        description: "",
        ...options.confirm,
      };
      if (!(await confirm(confirmOpts))) return false;
    }

    setBusy(true);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error ?? "Bulk action failed");
      return false;
    }

    if (data.failed?.length) {
      alert(
        `Updated ${data.succeeded?.length ?? 0}. Failed: ${data.failed.length}.`,
      );
    }

    clearSelection?.();
    router.refresh();
    return true;
  }

  return { busy, post };
}
