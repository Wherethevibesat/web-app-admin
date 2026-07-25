import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

/** Any signed-in admin (no permission gate). Use for Account settings. */
export async function requireAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const role = await getUserRole(supabase, user);
  if (role !== "admin") redirect("/auth/unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, name, metadata")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: profile ?? {
      id: user.id,
      email: user.email ?? null,
      name: null,
      metadata: null,
    },
  };
}
