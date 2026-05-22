import { PageHeader } from "@/components/admin/page-header";
import { VenueForm } from "@/components/admin/venue-form";

export default function NewVenuePage() {
  return (
    <div>
      <PageHeader title="Add venue" description="Create a new venue listing." />
      <VenueForm />
    </div>
  );
}
