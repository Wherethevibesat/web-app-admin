import { cn } from "@/lib/utils";

export function TableCheckbox({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 shrink-0 cursor-pointer rounded border-2 border-wtva-dark-300 bg-white accent-accent",
        "checked:border-accent checked:bg-accent",
        "disabled:cursor-not-allowed disabled:opacity-35",
        className,
      )}
      {...props}
    />
  );
}
