"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmDelete } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/input";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
import type { UserProfile, UserRole } from "@/lib/types/database";

export function UsersTable({ users }: { users: UserProfile[] }) {
  const router = useRouter();
  const confirmDelete = useConfirmDelete();
  const [busy, setBusy] = useState<string | null>(null);

  async function changeRole(userId: string, role: UserRole) {
    setBusy(userId);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setBusy(null);
    if (res.ok) router.refresh();
    else alert("Failed to update role");
  }

  async function deleteUser(userId: string, name: string) {
    if (!(await confirmDelete(name))) return;
    setBusy(userId);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) router.refresh();
    else {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Failed to delete user");
    }
  }

  if (users.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-wtva-dark-300 p-8 text-center text-wtva-muted">
        No users found.
      </p>
    );
  }

  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTableHeaderCell>Name</DataTableHeaderCell>
          <DataTableHeaderCell>Email</DataTableHeaderCell>
          <DataTableHeaderCell>Role</DataTableHeaderCell>
          <DataTableHeaderCell>Points</DataTableHeaderCell>
          <DataTableHeaderCell>Created</DataTableHeaderCell>
          <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {users.map((u) => (
          <DataTableRow key={u.id}>
            <DataTableCell>
              <Link href={`/users/${u.id}/edit`} className="font-medium hover:underline">
                {u.name}
              </Link>
            </DataTableCell>
            <DataTableCell>{u.email}</DataTableCell>
            <DataTableCell>
              <Select
                value={u.role}
                disabled={busy === u.id}
                onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                className="max-w-[160px]"
              >
                <option value="customer">Customer</option>
                <option value="venueOwner">Venue owner</option>
                <option value="driver">Driver</option>
                <option value="promoter">Promoter</option>
                <option value="admin">Admin</option>
              </Select>
            </DataTableCell>
            <DataTableCell>{u.total_points ?? 0}</DataTableCell>
            <DataTableCell className="text-wtva-muted">
              {new Date(u.created_at).toLocaleDateString()}
            </DataTableCell>
            <DataTableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Link
                  href={`/users/${u.id}/edit`}
                  className="inline-flex items-center rounded-lg border border-wtva-dark-300 px-3 py-1 text-xs font-semibold hover:border-wtva-muted"
                >
                  Edit
                </Link>
                <Button
                  variant="danger"
                  className="px-3 py-1 text-xs"
                  disabled={busy === u.id}
                  onClick={() => deleteUser(u.id, u.name)}
                >
                  Delete
                </Button>
              </div>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
