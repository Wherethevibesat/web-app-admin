import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { NeighborhoodForm } from "@/components/admin/neighborhood-form";
import { getNeighborhood } from "@/lib/admin/neighborhoods";

export default async function EditNeighborhoodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const neighborhood = await getNeighborhood(id).catch(() => null);

  if (!neighborhood) notFound();

  return (
    <div>
      <PageHeader title="Edit neighborhood" description={neighborhood.name} />
      <NeighborhoodForm neighborhood={neighborhood} />
    </div>
  );
}
