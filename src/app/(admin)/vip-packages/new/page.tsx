import { PageHeader } from "@/components/admin/page-header";
import { VipPackageForm } from "@/components/admin/vip-package-form";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listEvents } from "@/lib/admin/events";
import { listVenues } from "@/lib/admin/venues";

export default async function NewVipPackagePage() {
  await requireAdminPage("vip_packages");
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
