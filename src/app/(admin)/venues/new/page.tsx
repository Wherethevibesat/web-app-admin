import { PageHeader } from "@/components/admin/page-header";
import { VenueForm } from "@/components/admin/venue-form";
import { listNeighborhoods } from "@/lib/admin/neighborhoods";
import { DEFAULT_CITY } from "@/lib/types/neighborhood";

export default async function NewVenuePage() {
  const neighborhoods = await listNeighborhoods(DEFAULT_CITY).catch(() => []);

  return (
    <div>
      <PageHeader title="Add venue" description="Create a new venue listing." />
      <VenueForm neighborhoods={neighborhoods} />
    </div>
  );
}
