"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  BadgeCheck,
  FileCheck,
  LayoutDashboard,
  LogOut,
  MapPin,
  Settings,
  Star,
  Users,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/venues", label: "Venues", icon: Building2 },
  { href: "/neighborhoods", label: "Neighborhoods", icon: MapPin },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/users", label: "Users", icon: Users },
  { href: "/submissions", label: "Submissions", icon: FileCheck },
  { href: "/submissions/verification", label: "Verification", icon: BadgeCheck },
  { href: "/vip-packages", label: "VIP Packages", icon: Star },
  { href: "/earnings", label: "Earnings", icon: DollarSign },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

const navHrefs = navItems.map((item) => item.href);

/** Only the most specific matching nav item is active (avoids /submissions + /submissions/verification). */
function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  const hasMoreSpecificMatch = navHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
  return !hasMoreSpecificMatch;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-wtva-dark-300 bg-wtva-dark-400 transition-all",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className="flex items-center justify-between border-b border-wtva-dark-300 px-4 py-5">
        {!collapsed && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-wtva-subtle">
              WTVA
            </p>
            <p className="text-sm font-bold text-foreground">Admin Portal</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-lg p-2 text-wtva-muted hover:bg-wtva-dark-300"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-wtva-muted hover:bg-wtva-dark-300 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-wtva-dark-300 p-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-wtva-muted hover:bg-wtva-dark-300 hover:text-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
