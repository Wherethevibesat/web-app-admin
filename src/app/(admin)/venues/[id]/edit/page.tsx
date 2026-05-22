import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { VenueForm } from "@/components/admin/venue-form";
import { getVenue } from "@/lib/admin/venues";

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const venue = await getVenue(id).catch(() => null);

  if (!venue) notFound();

  return (
    <div>
      <PageHeader title="Edit venue" description={venue.name} />
      <VenueForm venue={venue} />
    </div>
  );
}
