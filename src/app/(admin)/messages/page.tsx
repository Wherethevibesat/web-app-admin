import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { MessageCampaignsTable } from "@/components/admin/message-campaigns-table";
import { MessageComposeForm } from "@/components/admin/message-compose-form";
import { MessageInbox } from "@/components/admin/message-inbox";
import { MessagesTabs } from "@/components/admin/messages-tabs";
import { listCampaigns, listSupportThreads } from "@/lib/admin/messages";
import { requireAdminPage } from "@/lib/admin/require-admin-page";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdminPage("messages");
  const { tab } = await searchParams;
  const activeTab =
    tab === "campaigns" || tab === "inbox" || tab === "compose" ? tab : "compose";

  const [campaigns, threads] = await Promise.all([
    listCampaigns().catch(() => []),
    listSupportThreads().catch(() => []),
  ]);

  return (
    <div>
      <PageHeader
        title="Message center"
        description="Broadcast announcements and handle 1:1 support conversations."
      />
      <Suspense fallback={<div className="mb-6 h-10" />}>
        <MessagesTabs />
      </Suspense>

      {activeTab === "compose" && <MessageComposeForm />}
      {activeTab === "campaigns" && <MessageCampaignsTable campaigns={campaigns} />}
      {activeTab === "inbox" && <MessageInbox initialThreads={threads} />}
    </div>
  );
}
