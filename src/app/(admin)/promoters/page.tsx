import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { AddPromoterForm } from "@/components/admin/add-promoter-form";
import { PromotersTable } from "@/components/admin/promoters-table";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listAllPromoterLinks, listPromoterUsers } from "@/lib/admin/promoters";
import { listVenues } from "@/lib/admin/venues";

export default async function PromotersPage() {
  await requireAdminPage("promoters");
  let links: Awaited<ReturnType<typeof listAllPromoterLinks>> = [];
  let promoters: Awaited<ReturnType<typeof listPromoterUsers>> = [];
  let venues: Awaited<ReturnType<typeof listVenues>> = [];
  let error: string | null = null;

  try {
    [links, promoters, venues] = await Promise.all([
      listAllPromoterLinks(),
      listPromoterUsers(),
      listVenues(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load promoters";
  }

  const pendingCount = links.filter((l) => l.status === "pending").length;

  return (
    <div>
      <PageHeader
        title="Promoters"
        description="Review promoter venue partnerships and event submissions."
      >
        <Link
          href="/submissions?tab=promoters"
          className="rounded-lg border border-wtva-dark-300 px-4 py-2 text-sm font-semibold hover:border-foreground"
        >
          Submissions
          {pendingCount > 0 ? ` (${pendingCount} pending)` : ""}
        </Link>
      </PageHeader>

      {error && (
        <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
          <span className="mt-2 block text-wtva-muted">
            Run migrations 016 and 017 in Supabase if promoter tables are missing.
          </span>
        </p>
      )}

      <AddPromoterForm
        venues={venues.map((v) => ({ id: v.id, name: v.name }))}
        promoters={promoters}
      />

      <PromotersTable links={links} />
    </div>
  );
}
