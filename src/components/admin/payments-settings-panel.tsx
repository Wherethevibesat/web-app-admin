import Link from "next/link";
import { CreditCard, KeyRound, Link2 } from "lucide-react";

const cards = [
  {
    href: "/settings/stripe/keys",
    title: "Stripe API keys",
    description: "Publishable key used by checkout on web and mobile.",
    icon: KeyRound,
  },
  {
    href: "/settings/stripe/accounts",
    title: "Connected accounts",
    description: "Venue and business Stripe Connect accounts linked to WTVA.",
    icon: Link2,
  },
] as const;

export function PaymentsSettingsPanel() {
  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border border-wtva-dark-300 bg-wtva-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-accent/10 p-2.5 text-accent">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Payments</h2>
            <p className="mt-1 text-sm text-wtva-muted">
              Manage Stripe keys and Connected accounts used for checkout,
              commissions, and venue payouts.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border border-wtva-dark-300 bg-wtva-card p-5 shadow-sm transition hover:border-accent/40 hover:shadow-md"
          >
            <card.icon className="h-5 w-5 text-wtva-muted transition group-hover:text-accent" />
            <h3 className="mt-3 font-semibold tracking-tight">{card.title}</h3>
            <p className="mt-1 text-sm text-wtva-muted">{card.description}</p>
            <span className="mt-4 inline-block text-sm font-medium text-accent">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
