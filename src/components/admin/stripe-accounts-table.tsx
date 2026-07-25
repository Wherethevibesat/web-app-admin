"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
import type { StripeAccountRow } from "@/lib/admin/stripe";

export function StripeAccountsTable({
  accounts,
}: {
  accounts: StripeAccountRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reconnect(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stripe/accounts/${id}`, {
        method: "POST",
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        throw new Error(body.error ?? "Could not start reconnect");
      }
      window.location.href = body.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reconnect failed");
      setBusyId(null);
    }
  }

  async function disconnect(id: string, name: string) {
    if (
      !confirm(
        `Disconnect “${name}” from Stripe Connect?\n\nPayouts for this account will stop until they reconnect.`,
      )
    ) {
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stripe/accounts/${id}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Disconnect failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <DataTable>
        <DataTableHead>
          <tr>
            <DataTableHeaderCell>Name</DataTableHeaderCell>
            <DataTableHeaderCell>Email</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
            <DataTableHeaderCell>Default</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {accounts.map((a) => {
            const busy = busyId === a.id;
            return (
              <DataTableRow key={a.id}>
                <DataTableCell className="font-medium">
                  {a.account_name}
                </DataTableCell>
                <DataTableCell>{a.email ?? "—"}</DataTableCell>
                <DataTableCell>
                  <Badge
                    variant={a.status === "active" ? "success" : "default"}
                  >
                    {a.status ?? "—"}
                  </Badge>
                </DataTableCell>
                <DataTableCell>{a.is_default ? "Yes" : "—"}</DataTableCell>
                <DataTableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => reconnect(a.id)}
                      className="!px-3 !py-1.5 text-xs"
                    >
                      {busy ? "…" : a.status === "active" ? "Reconnect" : "Continue setup"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => disconnect(a.id, a.account_name)}
                      className="!px-3 !py-1.5 text-xs text-red-600 hover:text-red-700"
                    >
                      Disconnect
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
      <p className="text-sm text-wtva-muted">
        <strong>Continue setup / Reconnect</strong> opens Stripe onboarding for that
        account. <strong>Disconnect</strong> unlinks payouts from WTVA (and removes the
        Express account when Stripe allows).
      </p>
    </div>
  );
}
