import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/get-user-role";

export async function requireAdmin() {
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

  return { error: null, status: 200, user, supabase };
}
