import { redirect } from "next/navigation";
import { type AdminPermission, hasAdminPermission } from "@/lib/admin/permissions";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

export async function requireAdminPage(permission: AdminPermission) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const role = await getUserRole(supabase, user);
  if (role !== "admin") redirect("/auth/unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("metadata")
    .eq("id", user.id)
    .maybeSingle();
  if (!hasAdminPermission(profile?.metadata, permission)) {
    redirect("/auth/unauthorized");
  }
}
