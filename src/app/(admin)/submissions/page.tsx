import { PageHeader } from "@/components/admin/page-header";
import { SubmissionsTabs } from "@/components/admin/submissions-tabs";
import { listPendingEvents } from "@/lib/admin/events";
import { listUnpublishedVenues } from "@/lib/admin/venues";
import { listPendingDriverCompanies } from "@/lib/admin/drivers";
import { listPendingPromoterLinks, listPendingPromoterEvents } from "@/lib/admin/promoters";

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab =
    tabParam === "events" ||
    tabParam === "drivers" ||
    tabParam === "promoters"
      ? tabParam
      : "venues";

  const [venues, events, drivers, promoterLinks, promoterEvents] = await Promise.all([
    listUnpublishedVenues().catch(() => []),
    listPendingEvents().catch(() => []),
    listPendingDriverCompanies().catch(() => []),
    listPendingPromoterLinks().catch(() => []),
    listPendingPromoterEvents().catch(() => []),
  ]);

  return (
    <div>
      <PageHeader
        title="Pending submissions"
        description="Approve venues, events, and driver listings before they appear in the app."
      />
      <SubmissionsTabs
        venues={venues}
        events={events}
        drivers={drivers}
        promoterLinks={promoterLinks}
        promoterEvents={promoterEvents}
        tab={tab}
      />
    </div>
  );
}
