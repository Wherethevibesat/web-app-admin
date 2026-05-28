"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPermissionsFields } from "@/components/admin/admin-permissions-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddAdminForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [adminPermissions, setAdminPermissions] = useState<string[]>(["all"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/admin/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, adminPermissions }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(body.error ?? "Failed to add admin");
      return;
    }

    setSuccess(
      body.created
        ? "Admin account created. They can use password reset to sign in."
        : "Existing user promoted to admin.",
    );
    setEmail("");
    setName("");
    setAdminPermissions(["all"]);
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-xl border border-wtva-dark-300 bg-wtva-card p-5"
    >
      <h2 className="text-lg font-semibold">Add admin</h2>
      <p className="mt-1 text-sm text-wtva-muted">
        Create a new admin by email or promote an existing user.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-wtva-muted">Email</span>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@company.com"
            className="mt-1"
          />
        </label>
        <label className="block text-sm">
          <span className="text-wtva-muted">Name (optional)</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Admin name"
            className="mt-1"
          />
        </label>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm text-wtva-muted">Permissions</p>
        <AdminPermissionsFields value={adminPermissions} onChange={setAdminPermissions} />
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-green-400">{success}</p>}

      <Button type="submit" disabled={busy} className="mt-4">
        {busy ? "Saving..." : "Add admin"}
      </Button>
    </form>
  );
}
