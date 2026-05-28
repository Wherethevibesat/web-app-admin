import { PageHeader } from "@/components/admin/page-header";
import { AddAdminForm } from "@/components/admin/add-admin-form";
import { UsersTable } from "@/components/admin/users-table";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listUsers } from "@/lib/admin/users";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminPage("users");
  const { q } = await searchParams;
  const users = await listUsers(q).catch(() => []);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage accounts and change roles. Changes are audit-logged."
      />
      <AddAdminForm />
      <form className="mb-6 max-w-md" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name or email…"
          className="w-full rounded-lg border border-wtva-dark-300 bg-wtva-dark-400 px-3 py-2 text-sm"
        />
      </form>
      <UsersTable users={users} />
    </div>
  );
}
