import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { EventGuideForm } from "@/components/admin/event-guide-form";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { getEventGuide } from "@/lib/admin/event-guides";
import { listEvents } from "@/lib/admin/events";

export default async function EditGuidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage("events");
  const { id } = await params;
  const [detail, events] = await Promise.all([
    getEventGuide(id).catch(() => null),
    listEvents().catch(() => []),
  ]);

  if (!detail) notFound();

  return (
    <div>
      <PageHeader
        title="Edit guide"
        description={`${detail.guide.title} · posted by ${detail.guide.posted_by_name}`}
      />
      <EventGuideForm
        guide={detail.guide}
        initialEventIds={detail.items.map((item) => item.event_id)}
        events={events}
      />
    </div>
  );
}
