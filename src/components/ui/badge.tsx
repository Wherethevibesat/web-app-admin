import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
        variant === "default" && "bg-wtva-dark-300 text-foreground",
        variant === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
        variant === "warning" && "bg-amber-50 text-amber-700 border border-amber-200",
        variant === "danger" && "bg-red-50 text-red-700 border border-red-200",
        className,
      )}
    >
      {children}
    </span>
  );
}
