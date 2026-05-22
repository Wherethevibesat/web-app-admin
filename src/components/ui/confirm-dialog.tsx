"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

const ConfirmContext = createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>;
} | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  function close(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [pending]);

  const isDanger = pending?.variant !== "default";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close dialog"
            onClick={() => close(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            className="relative z-10 w-full max-w-md rounded-xl border border-wtva-dark-300 bg-wtva-card p-6 shadow-2xl"
          >
            <h2
              id="confirm-dialog-title"
              className="text-lg font-bold text-foreground"
            >
              {pending.title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="mt-2 text-sm text-wtva-muted leading-relaxed"
            >
              {pending.description}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => close(false)}
              >
                {pending.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                type="button"
                variant={isDanger ? "danger" : "primary"}
                className={cn(!isDanger && "bg-foreground text-background")}
                onClick={() => close(true)}
                autoFocus
              >
                {pending.confirmLabel ?? (isDanger ? "Delete" : "Confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmDialogProvider");
  }
  return ctx.confirm;
}

/** Shorthand for destructive delete confirmations. */
export function useConfirmDelete() {
  const confirm = useConfirm();
  return useCallback(
    (name: string, extra?: string) =>
      confirm({
        title: "Delete?",
        description: extra
          ? `Delete "${name}"? ${extra}`
          : `Delete "${name}"? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      }),
    [confirm],
  );
}
