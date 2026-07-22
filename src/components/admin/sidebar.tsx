"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  BadgeCheck,
  FileCheck,
  LayoutDashboard,
  LogOut,
  MapPin,
  Megaphone,
  Settings,
  Star,
  Users,
  UserRound,
  MessageSquare,
  Inbox,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import type { AdminPermission } from "@/lib/admin/permissions";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" as AdminPermission },
  { href: "/venues", label: "Venues", icon: Building2, permission: "venues" as AdminPermission },
  { href: "/neighborhoods", label: "Neighborhoods", icon: MapPin, permission: "neighborhoods" as AdminPermission },
  { href: "/events", label: "Events", icon: Calendar, permission: "events" as AdminPermission },
  { href: "/drivers", label: "Drivers", icon: Car, permission: "drivers" as AdminPermission },
  { href: "/promoters", label: "Promoters", icon: Megaphone, permission: "promoters" as AdminPermission },
  { href: "/customers", label: "Customers", icon: UserRound, permission: "customers" as AdminPermission },
  { href: "/event-interest", label: "Event interest", icon: Inbox, permission: "customers" as AdminPermission },
  { href: "/messages", label: "Messages", icon: MessageSquare, permission: "messages" as AdminPermission },
  { href: "/users", label: "Users", icon: Users, permission: "users" as AdminPermission },
  { href: "/submissions", label: "Submissions", icon: FileCheck, permission: "submissions" as AdminPermission },
  { href: "/submissions/verification", label: "Verification", icon: BadgeCheck, permission: "verification" as AdminPermission },
  { href: "/vip-packages", label: "VIP Packages", icon: Star, permission: "vip_packages" as AdminPermission },
  { href: "/earnings", label: "Earnings", icon: DollarSign, permission: "earnings" as AdminPermission },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings" as AdminPermission },
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

export function AdminSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const allowed = new Set(permissions);
  const visibleItems = navItems.filter(
    (item) => allowed.has("all") || allowed.has(item.permission),
  );

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-wtva-dark-300 bg-white shadow-sm transition-all",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "border-b border-wtva-dark-300 px-3 py-4",
          collapsed ? "flex flex-col items-center gap-1" : "flex items-center justify-between gap-2",
        )}
      >
        {collapsed ? (
          <Link href="/" className="block overflow-hidden" aria-label="Where The Vibes At">
            <Image
              src="/brand/wtva-logo.jpg"
              alt="Where The Vibes At"
              width={1024}
              height={493}
              priority
              className="h-10 w-10 object-cover object-left mix-blend-multiply"
            />
          </Link>
        ) : (
          <BrandLogo href="/" label="Admin" heightClass="h-10" className="min-w-0" />
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 rounded-lg p-2 text-wtva-muted hover:bg-wtva-dark-300 hover:text-foreground"
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
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-gradient text-white shadow-accent"
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
