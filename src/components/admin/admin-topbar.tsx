"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function AdminTopbar({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayName = name.trim() || email.split("@")[0] || "Admin";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function handleSignOut() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-wtva-dark-300 bg-white/95 backdrop-blur">
      <div className="flex h-14 items-center justify-end gap-3 px-4 sm:px-6 lg:px-8">
        <div className="relative" ref={rootRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
            className={cn(
              "flex items-center gap-2 rounded-full border border-wtva-dark-300 bg-white py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors",
              "hover:border-accent/40 hover:bg-wtva-dark-400/50",
              open && "border-accent/40 bg-wtva-dark-400/50",
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-gradient text-xs font-bold text-white shadow-accent">
              {initials || <UserRound className="h-4 w-4" />}
            </span>
            <span className="max-w-[10rem] truncate text-foreground sm:max-w-[14rem]">
              {displayName}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-wtva-muted transition-transform",
                open && "rotate-180",
              )}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-wtva-dark-300 bg-white py-1 shadow-card"
            >
              <div className="border-b border-wtva-dark-300 px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayName}
                </p>
                {email && (
                  <p className="truncate text-xs text-wtva-muted">{email}</p>
                )}
              </div>
              <Link
                href="/settings?tab=account"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-wtva-dark-400"
              >
                <Settings className="h-4 w-4 text-wtva-muted" />
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-foreground hover:bg-wtva-dark-400"
              >
                <LogOut className="h-4 w-4 text-wtva-muted" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
