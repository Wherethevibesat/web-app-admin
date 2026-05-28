import { PageHeader } from "@/components/admin/page-header";
import { VerificationQueue } from "@/components/admin/verification-queue";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listPendingVerification } from "@/lib/admin/venues";

export default async function VerificationPage() {
  await requireAdminPage("verification");
  const venues = await listPendingVerification().catch(() => []);

  return (
    <div>
      <PageHeader
        title="Business verification"
        description="Review license and business documents uploaded by venue owners."
      />
      <VerificationQueue venues={venues} />
    </div>
  );
}
