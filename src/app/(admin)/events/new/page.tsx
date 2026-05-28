import { PageHeader } from "@/components/admin/page-header";
import { EventForm } from "@/components/admin/event-form";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listNeighborhoods } from "@/lib/admin/neighborhoods";
import { listVenues } from "@/lib/admin/venues";
import { DEFAULT_CITY } from "@/lib/types/neighborhood";

export default async function NewEventPage() {
  await requireAdminPage("events");
  const [venues, neighborhoods] = await Promise.all([
    listVenues().catch(() => []),
    listNeighborhoods(DEFAULT_CITY).catch(() => []),
  ]);

  return (
    <div>
      <PageHeader title="Add event" description="Create a new event listing." />
      <EventForm venues={venues} neighborhoods={neighborhoods} />
    </div>
  );
}
