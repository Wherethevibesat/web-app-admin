"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "account", label: "Account" },
  { id: "platform", label: "Platform" },
  { id: "payments", label: "Payments" },
] as const;

export type SettingsTabId = (typeof tabs)[number]["id"];

export function SettingsTabs({
  allowedTabs,
}: {
  allowedTabs: readonly SettingsTabId[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") ?? allowedTabs[0] ?? "account";
  const visible = tabs.filter((t) => allowedTabs.includes(t.id));

  return (
    <div className="mb-8 flex gap-1 border-b border-wtva-dark-300">
      {visible.map((tab) => {
        const href = `${pathname}?tab=${tab.id}`;
        const isActive = active === tab.id;
        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-wtva-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
