import { PageHeader } from "@/components/admin/page-header";
import { VipPackageForm } from "@/components/admin/vip-package-form";
import { listEvents } from "@/lib/admin/events";
import { listVenues } from "@/lib/admin/venues";

export default async function NewVipPackagePage() {
  const [venues, events] = await Promise.all([
    listVenues().catch(() => []),
    listEvents().catch(() => []),
  ]);

  return (
    <div>
      <PageHeader title="Add VIP package" description="Create a new VIP offering." />
      <VipPackageForm venues={venues} events={events} />
    </div>
  );
}
