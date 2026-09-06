import { PageHeader } from "@/components/admin/page-header";
import { EventGuideForm } from "@/components/admin/event-guide-form";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listEvents } from "@/lib/admin/events";

export default async function NewGuidePage() {
  await requireAdminPage("events");
  const events = await listEvents().catch(() => []);

  return (
    <div>
      <PageHeader
        title="New event guide"
        description="Create a curated weekend lineup. Events stay editable after you save."
      />
      <EventGuideForm initialEventIds={[]} events={events} />
    </div>
  );
}
