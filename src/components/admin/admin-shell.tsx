"use client";

import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return <ConfirmDialogProvider>{children}</ConfirmDialogProvider>;
}
