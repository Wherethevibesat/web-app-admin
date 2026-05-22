import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-wtva-dark-300 bg-wtva-dark-400 px-3 py-2 text-sm outline-none focus:border-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1 block text-sm font-medium text-wtva-muted", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-wtva-dark-300 bg-wtva-dark-400 px-3 py-2 text-sm outline-none focus:border-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border border-wtva-dark-300 bg-wtva-dark-400 px-3 py-2 text-sm outline-none focus:border-foreground",
        className,
      )}
      {...props}
    />
  );
}
