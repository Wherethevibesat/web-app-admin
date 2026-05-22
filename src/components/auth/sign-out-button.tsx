"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-lg border border-wtva-dark-300 px-4 py-2 text-sm font-medium text-wtva-muted hover:text-foreground"
    >
      Sign out
    </button>
  );
}
