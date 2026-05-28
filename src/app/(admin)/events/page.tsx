import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { EventsTable } from "@/components/admin/events-table";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listEvents } from "@/lib/admin/events";
import type { EventRow } from "@/lib/types/database";

export default async function EventsPage() {
  await requireAdminPage("events");
  let events: EventRow[] = [];
  let error: string | null = null;

  try {
    events = await listEvents();
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Events table not found — run 004_web_platform.sql";
  }

  return (
    <div>
      <PageHeader title="Events" description="Create and manage platform events.">
        <Link href="/events/new">
          <Button>Add event</Button>
        </Link>
      </PageHeader>
      {error && <p className="mb-4 text-sm text-amber-400">{error}</p>}
      <EventsTable events={events} />
    </div>
  );
}
