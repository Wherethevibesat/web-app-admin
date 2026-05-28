export const ADMIN_PERMISSIONS = [
  "dashboard",
  "venues",
  "neighborhoods",
  "events",
  "drivers",
  "promoters",
  "customers",
  "messages",
  "users",
  "submissions",
  "verification",
  "vip_packages",
  "earnings",
  "settings",
  "impersonation",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];
type Metadata = Record<string, unknown> | null | undefined;

const permissionSet = new Set<string>(ADMIN_PERMISSIONS);

export function normalizeAdminPermissions(metadata: Metadata): Set<string> {
  const raw = metadata?.adminPermissions;
  if (!Array.isArray(raw) || raw.length === 0) {
    // Backward compatibility: existing admins keep full access.
    return new Set(["all"]);
  }

  const normalized = raw
    .map((value) => (typeof value === "string" ? value : ""))
    .filter((value) => value === "all" || permissionSet.has(value));

  return new Set(normalized.length > 0 ? normalized : ["all"]);
}

export function hasAdminPermission(metadata: Metadata, permission: AdminPermission): boolean {
  const permissions = normalizeAdminPermissions(metadata);
  return permissions.has("all") || permissions.has(permission);
}

export function permissionsToMetadata(
  metadata: Metadata,
  permissions: readonly string[],
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    adminPermissions: permissions,
  };
}

export function permissionLabel(permission: AdminPermission): string {
  switch (permission) {
    case "dashboard":
      return "Dashboard";
    case "venues":
      return "Venues";
    case "neighborhoods":
      return "Neighborhoods";
    case "events":
      return "Events";
    case "drivers":
      return "Drivers";
    case "promoters":
      return "Promoters";
    case "customers":
      return "Customers";
    case "messages":
      return "Message center";
    case "users":
      return "Users & admins";
    case "submissions":
      return "Submissions";
    case "verification":
      return "Verification";
    case "vip_packages":
      return "VIP packages";
    case "earnings":
      return "Earnings";
    case "settings":
      return "Settings";
    case "impersonation":
      return "Impersonation";
    default:
      return permission;
  }
}
