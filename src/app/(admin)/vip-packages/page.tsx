import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { VipPackagesTable } from "@/components/admin/vip-packages-table";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listVipPackages } from "@/lib/admin/vip";
import type { VipPackageRow } from "@/lib/types/database";

export default async function VipPackagesPage() {
  await requireAdminPage("vip_packages");
  let packages: VipPackageRow[] = [];
  let error: string | null = null;

  try {
    packages = await listVipPackages();
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "VIP table not found — run 004_web_platform.sql";
  }

  return (
    <div>
      <PageHeader title="VIP packages" description="VIP catalog by venue and event.">
        <Link href="/vip-packages/new">
          <Button>Add package</Button>
        </Link>
      </PageHeader>
      {error && <p className="mb-4 text-sm text-amber-400">{error}</p>}
      <VipPackagesTable packages={packages} />
    </div>
  );
}
