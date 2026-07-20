import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ManagementCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
}

export function ManagementCard({
  title,
  description,
  icon: Icon,
  href,
  badge,
}: ManagementCardProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-wtva-dark-300 bg-wtva-card p-5 shadow-card transition-colors hover:border-accent"
    >
      <div className="rounded-xl bg-accent/10 p-3">
        <Icon className="h-7 w-7 text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          {badge != null && badge > 0 && (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-wtva-muted">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-wtva-subtle" />
    </Link>
  );
}
