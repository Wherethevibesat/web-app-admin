import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSidebar } from "@/components/admin/sidebar";
import { createClient } from "@/lib/supabase/server";
import { syncAdminProfile } from "@/lib/auth/sync-admin-profile";
import { getUserRole } from "@/lib/auth/get-user-role";

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

  return (
    <AdminShell>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="min-h-screen flex-1 overflow-y-auto bg-background">
          <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </AdminShell>
  );
}
