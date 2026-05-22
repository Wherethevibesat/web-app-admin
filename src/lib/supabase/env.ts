function cleanEnvValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v || undefined;
}

/** Edge-safe Supabase public env (no filesystem reads). */
export function getSupabasePublicEnv():
  | { url: string; anonKey: string }
  | null {
  const url = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/** Which required Vercel env vars are present (names only, for diagnostics). */
export function getEnvStatus() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(
      cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
    ),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(
      cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(
      cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
    ),
    NEXT_PUBLIC_SITE_URL: Boolean(
      cleanEnvValue(process.env.NEXT_PUBLIC_SITE_URL),
    ),
  };
}

export function requireSupabasePublicEnv(): { url: string; anonKey: string } {
  const env = getSupabasePublicEnv();
  if (!env) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return env;
}
