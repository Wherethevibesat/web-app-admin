import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

/** Service-role client for server-only routes. Never import in client components. */
export function createAdminClient() {
  const url =
    getEnv("NEXT_PUBLIC_SUPABASE_URL") ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
