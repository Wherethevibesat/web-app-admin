import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { VenueForm } from "@/components/admin/venue-form";
import { listNeighborhoods } from "@/lib/admin/neighborhoods";
import { getVenue } from "@/lib/admin/venues";
import { DEFAULT_CITY } from "@/lib/types/neighborhood";

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [venue, neighborhoods] = await Promise.all([
    getVenue(id).catch(() => null),
    listNeighborhoods(DEFAULT_CITY).catch(() => []),
  ]);

  if (!venue) notFound();

  return (
    <div>
      <PageHeader title="Edit venue" description={venue.name} />
      <VenueForm venue={venue} neighborhoods={neighborhoods} />
    </div>
  );
}
