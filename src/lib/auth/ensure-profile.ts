import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/** Keep public.users in sync with the signed-in auth user. */
export async function ensureUserProfile(user: User): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !user.email) return;

  try {
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("users")
      .select("name, role")
      .eq("email", user.email)
      .maybeSingle();

    await admin.from("users").upsert(
      {
        id: user.id,
        email: user.email,
        name: existing?.name ?? user.user_metadata?.name ?? "User",
        role: existing?.role ?? "customer",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  } catch (err) {
    console.error("ensureUserProfile:", err);
  }
}
