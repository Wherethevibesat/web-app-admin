import { cn } from "@/lib/utils";

export function TableCheckbox({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 shrink-0 cursor-pointer rounded border-2 border-zinc-400 bg-zinc-900 accent-white",
        "checked:border-white checked:bg-white",
        "disabled:cursor-not-allowed disabled:opacity-35",
        className,
      )}
      {...props}
    />
  );
}
