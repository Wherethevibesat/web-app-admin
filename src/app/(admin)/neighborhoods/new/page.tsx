import { PageHeader } from "@/components/admin/page-header";
import { NeighborhoodForm } from "@/components/admin/neighborhood-form";

export default function NewNeighborhoodPage() {
  return (
    <div>
      <PageHeader
        title="Add neighborhood"
        description="Create a new Houston neighborhood for customer browse and search."
      />
      <NeighborhoodForm />
    </div>
  );
}
