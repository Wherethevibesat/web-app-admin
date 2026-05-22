import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { VipPackageForm } from "@/components/admin/vip-package-form";
import { listEvents } from "@/lib/admin/events";
import { getVipPackage } from "@/lib/admin/vip";
import { listVenues } from "@/lib/admin/venues";

export default async function EditVipPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pkg, venues, events] = await Promise.all([
    getVipPackage(id).catch(() => null),
    listVenues().catch(() => []),
    listEvents().catch(() => []),
  ]);

  if (!pkg) notFound();

  return (
    <div>
      <PageHeader title="Edit VIP package" description={pkg.package_name} />
      <VipPackageForm pkg={pkg} venues={venues} events={events} />
    </div>
  );
}
