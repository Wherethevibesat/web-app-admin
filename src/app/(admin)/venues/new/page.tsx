import { PageHeader } from "@/components/admin/page-header";
import { VenueForm } from "@/components/admin/venue-form";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listNeighborhoods } from "@/lib/admin/neighborhoods";
import { DEFAULT_CITY } from "@/lib/types/neighborhood";

export default async function NewVenuePage() {
  await requireAdminPage("venues");
  const neighborhoods = await listNeighborhoods(DEFAULT_CITY).catch(() => []);

  return (
    <div>
      <PageHeader title="Add venue" description="Create a new venue listing." />
      <VenueForm neighborhoods={neighborhoods} />
    </div>
  );
}
