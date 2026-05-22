export default function ConfigurationErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">Server configuration required</h1>
      <p className="mt-4 max-w-md text-sm text-wtva-muted leading-relaxed">
        Supabase environment variables are missing or invalid on this deployment.
        In the Vercel project settings, add{" "}
        <code className="text-foreground">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
        <code className="text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{" "}
        <code className="text-foreground">SUPABASE_SERVICE_ROLE_KEY</code>, then
        redeploy.
      </p>
      <p className="mt-6 text-xs text-wtva-subtle">
        See <code>.env.example</code> in the repository for reference.
      </p>
    </div>
  );
}
