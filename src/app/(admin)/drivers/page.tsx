import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { DriversTable } from "@/components/admin/drivers-table";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listDriverCompanies } from "@/lib/admin/drivers";

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminPage("drivers");
  const { q } = await searchParams;
  let drivers: Awaited<ReturnType<typeof listDriverCompanies>> = [];
  let error: string | null = null;

  try {
    drivers = await listDriverCompanies(q);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load drivers";
  }

  return (
    <div>
      <PageHeader
        title="Drivers"
        description="Manage limo and driver company listings on the customer app."
      >
        <Link
          href="/submissions?tab=drivers"
          className="rounded-lg border border-wtva-dark-300 px-4 py-2 text-sm font-semibold hover:border-foreground"
        >
          Pending submissions
        </Link>
      </PageHeader>

      <form className="mb-6 max-w-md" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search company, city, email…"
          className="w-full rounded-lg border border-wtva-dark-300 bg-wtva-dark-400 px-3 py-2 text-sm"
        />
      </form>

      {error && (
        <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
          <span className="mt-2 block text-wtva-muted">
            Run migrations 013 and 014 in Supabase if the driver tables are missing.
          </span>
        </p>
      )}

      <DriversTable drivers={drivers} />
    </div>
  );
}
