import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-foreground text-background hover:opacity-90",
  secondary:
    "border border-wtva-dark-300 bg-wtva-card text-foreground hover:border-wtva-muted",
  danger: "bg-red-600 text-white hover:bg-red-500",
  ghost: "text-wtva-muted hover:bg-wtva-dark-300 hover:text-foreground",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
