import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listNightPackages, listPendingStopOffers } from "@/lib/admin/night-packages";
import { listFailedVibePayouts } from "@/lib/admin/vibe-payouts";
import { formatCents } from "@/lib/types/night-package";
import { StopOfferReviewActions } from "@/components/admin/stop-offer-review-actions";
import { VibePayoutRetryActions } from "@/components/admin/vibe-payout-retry-actions";

export default async function NightPackagesPage() {
  await requireAdminPage("vip_packages");
  const [packages, pending, failedPayouts] = await Promise.all([
    listNightPackages().catch(() => []),
    listPendingStopOffers().catch(() => []),
    listFailedVibePayouts().catch(() => []),
  ]);

  return (
    <div>
      <PageHeader
        title="Build Your Night"
        description="Curate multi-venue flows from approved venue stop offers."
      >
        <Link href="/night-packages/new">
          <Button>New package</Button>
        </Link>
      </PageHeader>

      {failedPayouts.length > 0 && (
        <section className="mb-8 rounded-xl border border-red-300/40 bg-red-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">
              Failed venue transfers ({failedPayouts.length})
            </h2>
            <VibePayoutRetryActions />
          </div>
          <ul className="mt-3 space-y-2">
            {failedPayouts.map((stop) => (
              <li
                key={stop.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-wtva-dark-300 bg-white px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {stop.title ?? "Stop"} · {formatCents(stop.venue_payout_cents)}
                  </p>
                  <p className="text-wtva-muted">
                    {stop.venue_name ?? stop.venue_id} · order {stop.order_id.slice(0, 8)}…
                  </p>
                </div>
                <VibePayoutRetryActions orderId={stop.order_id} stopId={stop.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length > 0 && (
        <section className="mb-8 rounded-xl border border-amber-300/40 bg-amber-50/50 p-4">
          <h2 className="font-semibold">Pending venue stop offers ({pending.length})</h2>
          <ul className="mt-3 space-y-2">
            {pending.map((stop) => (
              <li
                key={stop.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-wtva-dark-300 bg-white px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold">
                    {stop.title} · {formatCents(stop.price_cents)}
                  </p>
                  <p className="text-wtva-muted">
                    {stop.venue?.name} · {stop.slot_type}
                    {stop.contract_accepted ? " · contract ✓" : " · contract missing"}
                  </p>
                </div>
                <StopOfferReviewActions id={stop.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="overflow-hidden rounded-xl border border-wtva-dark-300">
        <table className="w-full text-left text-sm">
          <thead className="bg-wtva-card text-wtva-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Stops</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id} className="border-t border-wtva-dark-300">
                <td className="px-4 py-3">
                  <p className="font-semibold">{pkg.title}</p>
                  <p className="text-xs text-wtva-muted">{pkg.subtitle}</p>
                </td>
                <td className="px-4 py-3">{pkg.stops?.length ?? 0}</td>
                <td className="px-4 py-3 capitalize">{pkg.status}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/night-packages/${pkg.id}/edit`} className="font-semibold underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {packages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-wtva-muted">
                  No night packages yet. Create one from approved venue stops.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
