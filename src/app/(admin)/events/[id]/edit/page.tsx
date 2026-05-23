import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { EventForm } from "@/components/admin/event-form";
import { getEvent } from "@/lib/admin/events";
import { listNeighborhoods } from "@/lib/admin/neighborhoods";
import { listVenues } from "@/lib/admin/venues";
import { DEFAULT_CITY } from "@/lib/types/neighborhood";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, venues, neighborhoods] = await Promise.all([
    getEvent(id).catch(() => null),
    listVenues().catch(() => []),
    listNeighborhoods(DEFAULT_CITY).catch(() => []),
  ]);

  if (!event) notFound();

  return (
    <div>
      <PageHeader title="Edit event" description={event.title} />
      <EventForm event={event} venues={venues} neighborhoods={neighborhoods} />
    </div>
  );
}
