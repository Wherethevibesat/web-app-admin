import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/** Force-sync public.users for the signed-in auth user (server-only). */
export async function syncAdminProfile(user: User): Promise<string | null> {
  if (!user.email) return null;

  try {
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("users")
      .select("role, name")
      .eq("email", user.email)
      .maybeSingle();

    const role = existing?.role ?? "admin";

    const { error } = await admin.from("users").upsert(
      {
        id: user.id,
        email: user.email,
        name: existing?.name ?? user.user_metadata?.name ?? "User",
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      console.error("syncAdminProfile:", error.message);
      return null;
    }

    return role;
  } catch (err) {
    console.error("syncAdminProfile:", err);
    return null;
  }
}
