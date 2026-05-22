import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { EventForm } from "@/components/admin/event-form";
import { getEvent } from "@/lib/admin/events";
import { listVenues } from "@/lib/admin/venues";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, venues] = await Promise.all([
    getEvent(id).catch(() => null),
    listVenues().catch(() => []),
  ]);

  if (!event) notFound();

  return (
    <div>
      <PageHeader title="Edit event" description={event.title} />
      <EventForm event={event} venues={venues} />
    </div>
  );
}
