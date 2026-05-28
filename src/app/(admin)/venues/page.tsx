import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { VenuesTable } from "@/components/admin/venues-table";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listVenues } from "@/lib/admin/venues";
import type { VenueRow } from "@/lib/types/venue";

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminPage("venues");
  const { q } = await searchParams;
  let venues: VenueRow[] = [];
  let error: string | null = null;

  try {
    venues = await listVenues(q);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load venues";
  }

  return (
    <div>
      <PageHeader
        title="Venues"
        description="Manage all venues, feature listings, and verification."
      >
        <Link href="/venues/new">
          <Button>Add venue</Button>
        </Link>
      </PageHeader>

      <form className="mb-6 max-w-md" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, neighborhood, address…"
          className="w-full rounded-lg border border-wtva-dark-300 bg-wtva-dark-400 px-3 py-2 text-sm"
        />
      </form>

      {error && (
        <p className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
          <span className="mt-2 block text-wtva-muted">
            If columns are missing, run supabase/migrations/004_web_platform.sql
            in the Supabase SQL Editor.
          </span>
        </p>
      )}

      <VenuesTable venues={venues} />
    </div>
  );
}
