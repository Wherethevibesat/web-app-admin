"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "compose", label: "Compose" },
  { id: "campaigns", label: "Campaigns" },
  { id: "inbox", label: "Inbox" },
] as const;

export function MessagesTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") ?? "compose";

  return (
    <div className="mb-6 flex gap-2 border-b border-wtva-dark-300">
      {tabs.map((tab) => {
        const href = `${pathname}?tab=${tab.id}`;
        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active === tab.id
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
