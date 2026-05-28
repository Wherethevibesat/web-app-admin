import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { UserForm } from "@/components/admin/user-form";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { getUser } from "@/lib/admin/users";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage("users");
  const { id } = await params;
  const user = await getUser(id).catch(() => null);

  if (!user) notFound();

  return (
    <div>
      <PageHeader title="Edit user" description={user.email} />
      <UserForm user={user} />
    </div>
  );
}
