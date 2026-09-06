import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listEventGuides } from "@/lib/admin/event-guides";

export default async function GuidesPage() {
  await requireAdminPage("events");
  let guides: Awaited<ReturnType<typeof listEventGuides>> = [];
  let error: string | null = null;

  try {
    guides = await listEventGuides();
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Guides table not found — run 052_event_guides.sql";
  }

  return (
    <div>
      <PageHeader
        title="Event guides"
        description="Curated weekend lineups posted as WTVA Events. Edit these anytime after you share more flyers."
      >
        <Link href="/guides/new">
          <Button>New guide</Button>
        </Link>
      </PageHeader>
      {error && <p className="mb-4 text-sm text-amber-400">{error}</p>}
      {guides.length === 0 && !error && (
        <p className="rounded-xl border border-dashed border-wtva-dark-300 px-4 py-10 text-sm text-wtva-muted">
          No guides yet. Create Labor Day Weekend and attach events.
        </p>
      )}
      <ul className="space-y-3">
        {guides.map((guide) => (
          <li
            key={guide.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-wtva-dark-300 bg-wtva-card px-4 py-4"
          >
            <div>
              <p className="font-semibold">{guide.title}</p>
              <p className="text-sm text-wtva-muted">
                {guide.starts_on} – {guide.ends_on} · {guide.item_count ?? 0} events · Posted by{" "}
                {guide.posted_by_name}
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {guide.featured_on_homepage && (
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                  Homepage
                </span>
              )}
              <Link href={`/guides/${guide.id}`} className="font-semibold underline">
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
