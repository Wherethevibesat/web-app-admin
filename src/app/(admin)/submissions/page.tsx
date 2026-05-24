import { PageHeader } from "@/components/admin/page-header";
import { SubmissionsTabs } from "@/components/admin/submissions-tabs";
import { listPendingEvents } from "@/lib/admin/events";
import { listUnpublishedVenues } from "@/lib/admin/venues";
import { listPendingDriverCompanies } from "@/lib/admin/drivers";

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab =
    tabParam === "events" || tabParam === "drivers" ? tabParam : "venues";

  const [venues, events, drivers] = await Promise.all([
    listUnpublishedVenues().catch(() => []),
    listPendingEvents().catch(() => []),
    listPendingDriverCompanies().catch(() => []),
  ]);

  return (
    <div>
      <PageHeader
        title="Pending submissions"
        description="Approve venues, events, and driver listings before they appear in the app."
      />
      <SubmissionsTabs venues={venues} events={events} drivers={drivers} tab={tab} />
    </div>
  );
}
