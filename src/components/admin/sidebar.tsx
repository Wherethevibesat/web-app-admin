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
  MapPin,
  Megaphone,
  Settings,
  Sparkles,
  Star,
  Users,
  UserRound,
  MessageSquare,
  Inbox,
} from "lucide-react";
import { useState } from "react";
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
  { href: "/night-packages", label: "Build Your Night", icon: Sparkles, permission: "vip_packages" as AdminPermission },
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
  const [collapsed, setCollapsed] = useState(false);
  const allowed = new Set(permissions);
  // Settings always shows — Account (password/profile) is for every admin.
  // Platform/Payments tabs inside still require the settings permission.
  const visibleItems = navItems.filter(
    (item) =>
      item.href === "/settings" ||
      allowed.has("all") ||
      allowed.has(item.permission),
  );

  return (
    <aside
      className={cn(
        "flex min-h-screen shrink-0 flex-col border-r border-wtva-dark-300 bg-white shadow-sm transition-all",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "border-b border-wtva-dark-300 px-3 py-3",
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
              className="h-9 w-9 object-cover object-left mix-blend-multiply"
            />
          </Link>
        ) : (
          <BrandLogo href="/" label="Admin" heightClass="h-9" className="min-w-0" />
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 rounded-lg p-1.5 text-wtva-muted hover:bg-wtva-dark-300 hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 p-2">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-gradient text-white shadow-accent"
                  : "text-wtva-muted hover:bg-wtva-dark-300 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
