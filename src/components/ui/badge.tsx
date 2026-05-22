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
        variant === "success" && "bg-green-900/50 text-green-300",
        variant === "warning" && "bg-amber-900/50 text-amber-300",
        variant === "danger" && "bg-red-900/50 text-red-300",
        className,
      )}
    >
      {children}
    </span>
  );
}
