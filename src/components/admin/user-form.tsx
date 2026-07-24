"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPermissionsFields } from "@/components/admin/admin-permissions-fields";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import type { UserProfile, UserRole } from "@/lib/types/database";

const BUSINESS_ROLES: UserRole[] = ["venueOwner", "driver", "promoter"];

export function UserForm({ user }: { user: UserProfile }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<UserRole>(user.role);
  const [adminPermissions, setAdminPermissions] = useState<string[]>(
    Array.isArray(user.metadata?.adminPermissions)
      ? (user.metadata.adminPermissions as string[])
      : ["all"],
  );
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        role,
        adminPermissions: role === "admin" ? adminPermissions : undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save");
      return;
    }
    router.push("/users");
    router.refresh();
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete user?",
      description: `Delete "${user.name}" (${user.email})? This removes their account and related data. This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to delete");
      return;
    }
    router.push("/users");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      {BUSINESS_ROLES.includes(user.role) && (
        <div className="rounded-lg border border-wtva-dark-300 bg-wtva-card p-4">
          <p className="text-sm text-wtva-muted">
            Open the business portal signed in as this user (opens in a new tab).
          </p>
          <div className="mt-3">
            <ImpersonateButton userId={user.id} />
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <Select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="mt-1"
        >
          <option value="customer">Customer</option>
          <option value="venueOwner">Venue owner</option>
          <option value="admin">Admin</option>
        </Select>
      </div>
      <p className="text-sm text-wtva-muted">
        User ID: {user.id}
      </p>
      {role === "admin" && (
        <div>
          <Label>Admin permissions</Label>
          <div className="mt-2 rounded-lg border border-wtva-dark-300 p-3">
            <AdminPermissionsFields value={adminPermissions} onChange={setAdminPermissions} />
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="submit" disabled={loading || deleting}>
          {loading ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/users")}
          disabled={loading || deleting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          className="ml-auto"
          onClick={handleDelete}
          disabled={loading || deleting}
        >
          {deleting ? "Deleting…" : "Delete user"}
        </Button>
      </div>
    </form>
  );
}
