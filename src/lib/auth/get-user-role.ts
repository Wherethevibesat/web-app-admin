import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/env";

export async function getUserRole(
  supabase: SupabaseClient,
  user: User,
): Promise<string | null> {
  const hasServiceKey = Boolean(
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ??
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  if (hasServiceKey && user.email) {
    try {
      const admin = createAdminClient();

      const { data: byEmail, error } = await admin
        .from("users")
        .select("role")
        .eq("email", user.email)
        .maybeSingle();

      if (!error && byEmail?.role) return byEmail.role;

      const { data: byId } = await admin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (byId?.role) return byId.role;
    } catch (err) {
      console.error("getUserRole (service):", err);
    }
  }

  const { data: sessionProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return sessionProfile?.role ?? null;
}
