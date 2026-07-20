import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { syncAdminProfile } from "@/lib/auth/sync-admin-profile";
import { getUserRole } from "@/lib/auth/get-user-role";
import { getEnv } from "@/lib/env";

export default async function UnauthorizedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let syncError: string | null = null;

  if (user) {
    const synced = await syncAdminProfile(user);
    if (!synced) {
      syncError = getEnv("SUPABASE_SERVICE_ROLE_KEY")
        ? "Could not update your profile. Check the terminal for errors."
        : "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local — add it and restart npm run dev.";
    }
  }

  const role = user ? await getUserRole(supabase, user) : null;

  if (role === "admin") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <ShieldOff className="h-12 w-12 text-wtva-muted" />
      <div>
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-2 max-w-md text-sm text-wtva-muted">
          This portal is for WTVA administrators only.
        </p>
        {user && (
          <div className="mx-auto mt-4 max-w-md rounded-lg border border-wtva-dark-300 bg-wtva-card p-4 text-left text-sm">
            <p>
              <span className="text-wtva-muted">Signed in as:</span>{" "}
              <strong>{user.email}</strong>
            </p>
            <p className="mt-2">
              <span className="text-wtva-muted">Role the site sees:</span>{" "}
              <strong>{role ?? "none"}</strong>
            </p>
            {syncError && (
              <p className="mt-3 text-red-400">{syncError}</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          className="rounded-full bg-accent-gradient shadow-accent px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </Link>
        {user && <SignOutButton />}
      </div>
    </div>
  );
}
