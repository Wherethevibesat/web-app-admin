import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { NeighborhoodsTable } from "@/components/admin/neighborhoods-table";
import { Button } from "@/components/ui/button";
import { listNeighborhoods } from "@/lib/admin/neighborhoods";
import { DEFAULT_CITY, type NeighborhoodRow } from "@/lib/types/neighborhood";

export default async function NeighborhoodsPage() {
  let neighborhoods: NeighborhoodRow[] = [];
  let error: string | null = null;

  try {
    neighborhoods = await listNeighborhoods(DEFAULT_CITY);
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Neighborhoods table not found — run 007_neighborhoods.sql";
  }

  return (
    <div>
      <PageHeader
        title="Neighborhoods"
        description={`Manage browseable areas for ${DEFAULT_CITY}. Customers search and filter using this list.`}
      >
        <Link href="/neighborhoods/new">
          <Button>Add neighborhood</Button>
        </Link>
      </PageHeader>
      {error && <p className="mb-4 text-sm text-amber-400">{error}</p>}
      <NeighborhoodsTable neighborhoods={neighborhoods} />
    </div>
  );
}
