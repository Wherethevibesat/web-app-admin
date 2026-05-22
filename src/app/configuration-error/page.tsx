import { getEnvStatus } from "@/lib/supabase/env";

const VARS = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    hint: "Supabase → Settings → API → Project URL",
    required: true,
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    hint: "Supabase → Settings → API → anon public key",
    required: true,
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    hint: "Supabase → Settings → API → service_role (secret)",
    required: true,
  },
  {
    key: "NEXT_PUBLIC_SITE_URL",
    hint: "Your Vercel URL, e.g. https://web-app-admin-nine.vercel.app",
    required: false,
  },
] as const;

export default function ConfigurationErrorPage() {
  const status = getEnvStatus();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-xl border border-wtva-dark-300 bg-wtva-card p-8">
        <h1 className="text-2xl font-bold">Server configuration required</h1>
        <p className="mt-3 text-sm text-wtva-muted leading-relaxed">
          This deployment is missing Supabase environment variables in{" "}
          <strong className="text-foreground">Vercel</strong>. Copy the same
          values from your local <code>.env.local</code> (do not commit that file).
        </p>

        <ul className="mt-6 space-y-3 text-sm">
          {VARS.map(({ key, hint, required }) => {
            const ok = status[key as keyof typeof status];
            return (
              <li
                key={key}
                className="rounded-lg border border-wtva-dark-300 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <code className="text-xs text-foreground">{key}</code>
                  <span
                    className={
                      ok
                        ? "shrink-0 text-xs font-semibold text-green-400"
                        : "shrink-0 text-xs font-semibold text-red-400"
                    }
                  >
                    {ok ? "Set" : required ? "Missing" : "Optional"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-wtva-subtle">{hint}</p>
              </li>
            );
          })}
        </ul>

        <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-wtva-muted">
          <li>
            Open{" "}
            <a
              href="https://vercel.com/dashboard"
              className="underline text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              Vercel Dashboard
            </a>{" "}
            → your <strong>web-app-admin</strong> project →{" "}
            <strong>Settings → Environment Variables</strong>
          </li>
          <li>
            Add each missing variable for{" "}
            <strong>Production</strong> and <strong>Preview</strong> (check both).
          </li>
          <li>
            <strong>Deployments → Redeploy</strong> (required — env changes do
            not apply until you redeploy).
          </li>
        </ol>
      </div>
    </div>
  );
}
