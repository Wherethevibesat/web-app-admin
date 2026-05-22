import { PageHeader } from "@/components/admin/page-header";
import { SubmissionsTabs } from "@/components/admin/submissions-tabs";
import { listPendingEvents } from "@/lib/admin/events";
import { listUnpublishedVenues } from "@/lib/admin/venues";

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "events" ? "events" : "venues";

  const [venues, events] = await Promise.all([
    listUnpublishedVenues().catch(() => []),
    listPendingEvents().catch(() => []),
  ]);

  return (
    <div>
      <PageHeader
        title="Pending submissions"
        description="Approve venues and events before they appear in the app."
      />
      <SubmissionsTabs venues={venues} events={events} tab={tab} />
    </div>
  );
}
