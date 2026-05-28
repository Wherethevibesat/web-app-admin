import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/get-user-role";
import {
  type AdminPermission,
  hasAdminPermission,
  normalizeAdminPermissions,
} from "@/lib/admin/permissions";

function inferPermissionFromCaller(): AdminPermission | null {
  const stack = new Error().stack ?? "";
  const match = stack.match(/app[\\/]+api[\\/]+admin[\\/]+([^\\/]+)/i);
  const segment = match?.[1]?.toLowerCase();
  if (!segment) return null;

  if (segment === "venues") return "venues";
  if (segment === "events") return "events";
  if (segment === "drivers") return "drivers";
  if (segment === "promoter-links" || segment === "promoter-events") return "promoters";
  if (segment === "customers") return "customers";
  if (segment === "messages") return "messages";
  if (segment === "users") return "users";
  if (segment === "neighborhoods") return "neighborhoods";
  if (segment === "vip-packages") return "vip_packages";
  if (segment === "withdrawals") return "earnings";
  if (segment === "settings" || segment === "stripe") return "settings";
  if (segment === "verification") return "verification";
  if (segment === "impersonate") return "impersonation";

  return null;
}

export async function requireAdmin(requiredPermission?: AdminPermission) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" as const, status: 401, user: null, supabase };
  }

  const role = await getUserRole(supabase, user);
  if (role !== "admin") {
    return { error: "Forbidden" as const, status: 403, user: null, supabase };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("metadata")
    .eq("id", user.id)
    .maybeSingle();

  const permission = requiredPermission ?? inferPermissionFromCaller();
  if (permission && !hasAdminPermission(profile?.metadata, permission)) {
    return { error: "Forbidden" as const, status: 403, user: null, supabase };
  }

  return {
    error: null,
    status: 200,
    user,
    supabase,
    permissions: [...normalizeAdminPermissions(profile?.metadata)],
  };
}
