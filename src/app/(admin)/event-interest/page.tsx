import { PageHeader } from "@/components/admin/page-header";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
import { listEventInterest } from "@/lib/admin/event-interest";
import { requireAdminPage } from "@/lib/admin/require-admin-page";

const SOURCE_LABEL: Record<string, string> = {
  notify_me: "Notify me",
  tip_a_night: "Tip a night",
  empty_feed: "Empty feed",
};

export default async function EventInterestPage() {
  await requireAdminPage("customers");
  const rows = await listEventInterest().catch(() => []);

  return (
    <div>
      <PageHeader
        title="Event interest"
        description="Notify-me signups and tip-a-night submissions from the customer app."
      />
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-wtva-dark-300 p-8 text-center text-wtva-muted">
          No interest submissions yet. Run migration 037_event_interest.sql if this table is missing.
        </p>
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>When</DataTableHeaderCell>
              <DataTableHeaderCell>Source</DataTableHeaderCell>
              <DataTableHeaderCell>Contact</DataTableHeaderCell>
              <DataTableHeaderCell>Vibe / place</DataTableHeaderCell>
              <DataTableHeaderCell>Note</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rows.map((row) => (
              <DataTableRow key={row.id}>
                <DataTableCell className="whitespace-nowrap text-wtva-muted">
                  {new Date(row.created_at).toLocaleString()}
                </DataTableCell>
                <DataTableCell className="font-medium">
                  {SOURCE_LABEL[row.source] ?? row.source}
                </DataTableCell>
                <DataTableCell>
                  <div className="font-medium">{row.email}</div>
                  {row.name && <div className="text-xs text-wtva-muted">{row.name}</div>}
                </DataTableCell>
                <DataTableCell>
                  <div className="text-sm">{row.vibe || "—"}</div>
                  <div className="text-xs text-wtva-muted">
                    {[row.city, row.neighborhood].filter(Boolean).join(" · ") || "—"}
                  </div>
                </DataTableCell>
                <DataTableCell className="max-w-xs text-sm text-wtva-muted">
                  {row.note || "—"}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
