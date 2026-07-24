import { PageHeader } from "@/components/admin/page-header";
import { NightPackageForm } from "@/components/admin/night-package-form";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listApprovedStopOffers } from "@/lib/admin/night-packages";

export default async function NewNightPackagePage() {
  await requireAdminPage("vip_packages");
  const approvedStops = await listApprovedStopOffers().catch(() => []);

  return (
    <div>
      <PageHeader title="New night package" description="Assemble a multi-venue flow." />
      <NightPackageForm approvedStops={approvedStops} />
    </div>
  );
}
