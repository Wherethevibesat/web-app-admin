import { PageHeader } from "@/components/admin/page-header";
import { CustomersImportForm } from "@/components/admin/customers-import-form";
import { CustomersInviteQueueCard } from "@/components/admin/customers-invite-queue-card";
import { CustomersTable } from "@/components/admin/customers-table";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { getCustomerInviteQueueStats, listCustomers } from "@/lib/admin/customers";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminPage("customers");
  const { q } = await searchParams;
  const [customers, queueStats] = await Promise.all([
    listCustomers(q).catch(() => []),
    getCustomerInviteQueueStats().catch(() => ({
      pending_invite: 0,
      invited: 0,
      activated: 0,
      failed: 0,
      retryable_failed: 0,
      max_attempts_reached: 0,
      unsubscribed: 0,
      maxAttempts: 3,
    })),
  ]);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer records and import upcoming outreach lists."
      />
      <form className="mb-6 max-w-md" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name or email..."
          className="w-full rounded-lg border border-wtva-dark-300 bg-wtva-dark-400 px-3 py-2 text-sm"
        />
      </form>
      <CustomersInviteQueueCard stats={queueStats} />
      <CustomersImportForm />
      <CustomersTable customers={customers} />
    </div>
  );
}
