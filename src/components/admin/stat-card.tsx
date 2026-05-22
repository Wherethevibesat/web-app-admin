import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  href?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  href,
  className,
}: StatCardProps) {
  const content = (
    <div
      className={cn(
        "rounded-xl border border-wtva-dark-300 bg-wtva-card p-5 transition-colors",
        href && "hover:border-wtva-muted",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-lg bg-wtva-dark-300 p-2">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-wtva-muted">{title}</p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
