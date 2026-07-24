"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  BulkActionBar,
  SelectAllHeaderCell,
  SelectRowCell,
  useTableSelection,
} from "@/components/admin/table-selection";
import { useBulkRequest } from "@/components/admin/use-bulk-request";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import { permissionLabel, type AdminPermission } from "@/lib/admin/permissions";
import type { UserProfile, UserRole } from "@/lib/types/database";

const BUSINESS_ROLES: UserRole[] = ["venueOwner", "driver", "promoter"];
type UserSortField = "created_at" | "name" | "email" | "role";
type SortDirection = "asc" | "desc";

function adminAccessLabel(user: UserProfile): string {
  if (user.role !== "admin") return "—";
  const perms = user.metadata?.adminPermissions;
  if (!Array.isArray(perms) || perms.length === 0 || perms.includes("all")) return "Full access";
  return (perms as string[])
    .slice(0, 2)
    .map((p) => permissionLabel(p as AdminPermission))
    .join(", ");
}

export function UsersTable({ users }: { users: UserProfile[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkRole, setBulkRole] = useState<UserRole>("customer");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [sortField, setSortField] = useState<UserSortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!term) return true;
      return (
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term)
      );
    });

    return [...filtered].sort((a, b) => {
      let comp = 0;
      switch (sortField) {
        case "name":
          comp = a.name.localeCompare(b.name);
          break;
        case "email":
          comp = a.email.localeCompare(b.email);
          break;
        case "role":
          comp = a.role.localeCompare(b.role);
          break;
        case "created_at":
        default:
          comp =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [users, search, roleFilter, sortField, sortDirection]);
  const ids = visibleUsers.map((u) => u.id);
  const selection = useTableSelection(ids);
  const bulk = useBulkRequest(selection.clearSelection);
  const selectedVisibleIds = selection.selectedIds.filter((id) => ids.includes(id));
  const selectedVisibleCount = selectedVisibleIds.length;

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

  const rowBusy = (id: string) => busy === id || bulk.busy;

  if (users.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-wtva-dark-300 p-8 text-center text-wtva-muted">
        No users found.
      </p>
    );
  }

  return (
    <>
      <div className="mb-4 grid gap-3 rounded-lg border border-wtva-dark-300 bg-wtva-dark-400/50 p-4 md:grid-cols-4">
        <Input
          placeholder="Search name, email, or role"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:col-span-2"
        />
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
        >
          <option value="all">All roles</option>
          <option value="customer">Customer</option>
          <option value="venueOwner">Venue owner</option>
          <option value="promoter">Promoter</option>
          <option value="driver">Driver</option>
          <option value="admin">Admin</option>
        </Select>
        <div className="flex gap-2">
          <Select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as UserSortField)}
          >
            <option value="created_at">Sort by created</option>
            <option value="name">Sort by name</option>
            <option value="email">Sort by email</option>
            <option value="role">Sort by role</option>
          </Select>
          <Select
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value as SortDirection)}
            className="max-w-[110px]"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </Select>
        </div>
      </div>

      <BulkActionBar
        itemLabel="users"
        totalCount={visibleUsers.length}
        selectedCount={selectedVisibleCount}
        allSelected={selection.allSelected}
        busy={bulk.busy}
        onSelectAll={selection.toggleAll}
        onClear={selection.clearSelection}
      >
        <div className="flex items-center gap-2">
          <Select
            value={bulkRole}
            onChange={(e) => setBulkRole(e.target.value as UserRole)}
            className="max-w-[140px] px-2 py-1 text-xs"
            disabled={bulk.busy}
          >
            <option value="customer">Customer</option>
            <option value="venueOwner">Venue owner</option>
            <option value="promoter">Promoter</option>
            <option value="driver">Driver</option>
          </Select>
          <Button
            variant="secondary"
            className="px-3 py-1 text-xs"
            disabled={bulk.busy}
            onClick={() =>
              bulk.post(
                "/api/admin/users/bulk",
                { ids: selectedVisibleIds, action: "set_role", role: bulkRole },
                {
                  confirm: {
                    title: `Set role to ${bulkRole} for ${selectedVisibleCount} user(s)?`,
                    confirmLabel: "Apply role",
                  },
                },
              )
            }
          >
            Set role
          </Button>
        </div>
        <Button
          variant="danger"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post(
              "/api/admin/users/bulk",
              { ids: selectedVisibleIds, action: "delete" },
              { useDeleteConfirm: true, itemName: `${selectedVisibleCount} users` },
            )
          }
        >
          Delete
        </Button>
      </BulkActionBar>

      <DataTable>
        <DataTableHead>
          <tr>
            <SelectAllHeaderCell
              checked={selection.allSelected}
              disabled={bulk.busy}
              onChange={selection.toggleAll}
            />
            <DataTableHeaderCell>Name</DataTableHeaderCell>
            <DataTableHeaderCell>Email</DataTableHeaderCell>
            <DataTableHeaderCell>Role</DataTableHeaderCell>
            <DataTableHeaderCell>Access</DataTableHeaderCell>
            <DataTableHeaderCell>Created</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {visibleUsers.map((u) => (
            <DataTableRow key={u.id}>
              <SelectRowCell
                id={u.id}
                label={u.name}
                checked={selection.selected.has(u.id)}
                disabled={rowBusy(u.id)}
                onChange={selection.toggleOne}
              />
              <DataTableCell>
                <Link href={`/users/${u.id}/edit`} className="font-medium hover:underline">
                  {u.name}
                </Link>
              </DataTableCell>
              <DataTableCell>{u.email}</DataTableCell>
              <DataTableCell>
                <Select
                  value={u.role}
                  disabled={rowBusy(u.id)}
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
              <DataTableCell className="text-wtva-muted">{adminAccessLabel(u)}</DataTableCell>
              <DataTableCell className="text-wtva-muted">
                {new Date(u.created_at).toLocaleDateString()}
              </DataTableCell>
              <DataTableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {BUSINESS_ROLES.includes(u.role) && (
                    <ImpersonateButton userId={u.id} />
                  )}
                  <Link
                    href={`/users/${u.id}/edit`}
                    className="inline-flex items-center rounded-lg border border-wtva-dark-300 px-3 py-1 text-xs font-semibold hover:border-wtva-muted"
                  >
                    Edit
                  </Link>
                </div>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
      {visibleUsers.length === 0 && (
        <p className="mt-3 text-sm text-wtva-muted">No users match current filters.</p>
      )}
    </>
  );
}
