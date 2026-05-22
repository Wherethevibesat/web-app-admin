import { PageHeader } from "@/components/admin/page-header";
import { EventForm } from "@/components/admin/event-form";
import { listVenues } from "@/lib/admin/venues";

export default async function NewEventPage() {
  const venues = await listVenues().catch(() => []);

  return (
    <div>
      <PageHeader title="Add event" description="Create a new event listing." />
      <EventForm venues={venues} />
    </div>
  );
}
