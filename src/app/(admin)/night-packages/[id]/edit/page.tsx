import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { NightPackageForm } from "@/components/admin/night-package-form";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { getNightPackage, listApprovedStopOffers } from "@/lib/admin/night-packages";

export default async function EditNightPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage("vip_packages");
  const { id } = await params;
  const [pkg, approvedStops] = await Promise.all([
    getNightPackage(id),
    listApprovedStopOffers().catch(() => []),
  ]);
  if (!pkg) notFound();

  return (
    <div>
      <PageHeader title="Edit night package" description={pkg.title} />
      <NightPackageForm initial={pkg} approvedStops={approvedStops} />
    </div>
  );
}
