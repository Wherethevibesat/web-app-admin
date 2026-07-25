import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { createClient } from "@/lib/supabase/server";
import { syncAdminProfile } from "@/lib/auth/sync-admin-profile";
import { getUserRole } from "@/lib/auth/get-user-role";
import { normalizeAdminPermissions } from "@/lib/admin/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  await syncAdminProfile(user);
  const role = await getUserRole(supabase, user);

  if (role !== "admin") {
    redirect("/auth/unauthorized");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, metadata")
    .eq("id", user.id)
    .maybeSingle();
  const permissions = [...normalizeAdminPermissions(profile?.metadata)];
  const displayName =
    (typeof profile?.name === "string" && profile.name.trim()) ||
    (typeof user.user_metadata?.name === "string" &&
      user.user_metadata.name.trim()) ||
    "";
  const email = profile?.email || user.email || "";

  return (
    <AdminShell>
      <div className="flex min-h-screen items-stretch bg-background">
        <AdminSidebar permissions={permissions} />
        <div className="flex min-w-0 flex-1 flex-col bg-wtva-card">
          <AdminTopbar name={displayName} email={email} />
          <main className="min-w-0 flex-1 bg-wtva-card">
            <div className="w-full max-w-none p-6 lg:p-8 text-foreground">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminShell>
  );
}
