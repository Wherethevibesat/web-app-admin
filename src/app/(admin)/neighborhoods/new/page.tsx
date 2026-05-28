import { PageHeader } from "@/components/admin/page-header";
import { NeighborhoodForm } from "@/components/admin/neighborhood-form";
import { requireAdminPage } from "@/lib/admin/require-admin-page";

export default async function NewNeighborhoodPage() {
  await requireAdminPage("neighborhoods");
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
