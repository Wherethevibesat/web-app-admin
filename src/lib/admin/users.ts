import { createAdminClient } from "@/lib/supabase/admin";
import { permissionsToMetadata } from "@/lib/admin/permissions";
import type { UserProfile, UserRole } from "@/lib/types/database";

export async function listUsers(search?: string): Promise<UserProfile[]> {
  const admin = createAdminClient();
  const { data: users, error } = await admin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  let rows = (users ?? []).map((u) => ({
    ...u,
    total_points: 0,
  })) as UserProfile[];

  if (search?.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }

  return rows;
}

export async function getUser(userId: string): Promise<UserProfile | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    total_points: 0,
  } as UserProfile;
}

export async function updateUserRole(userId: string, role: UserRole) {
  await updateUser(userId, { role });
}

export async function updateUser(
  userId: string,
  fields: {
    name?: string;
    email?: string;
    role?: UserRole;
    adminPermissions?: string[];
  },
) {
  const admin = createAdminClient();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.name !== undefined) payload.name = fields.name.trim();
  if (fields.email !== undefined) payload.email = fields.email.trim().toLowerCase();
  if (fields.role !== undefined) payload.role = fields.role;
  if (fields.adminPermissions !== undefined) {
    const { data: existing } = await admin
      .from("users")
      .select("metadata")
      .eq("id", userId)
      .maybeSingle();
    payload.metadata = permissionsToMetadata(
      (existing?.metadata as Record<string, unknown> | undefined) ?? {},
      fields.adminPermissions,
    );
  }

  const { error } = await admin.from("users").update(payload).eq("id", userId);
  if (error) throw error;

  if (fields.role === "promoter") {
    const { data: userRow } = await admin
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .maybeSingle();
    if (userRow) {
      await admin.from("promoter_profiles").upsert(
        {
          user_id: userId,
          display_name: userRow.name,
          contact_email: userRow.email,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }
  }

  if (fields.email !== undefined) {
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      email: fields.email.trim().toLowerCase(),
    });
    if (authError) throw authError;
  }
}

export async function createOrPromoteAdmin(input: {
  email: string;
  name?: string;
  adminPermissions: string[];
}) {
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();
  const displayName = input.name?.trim() || email.split("@")[0] || "Admin";

  const { data: existing } = await admin
    .from("users")
    .select("id, metadata")
    .eq("email", email)
    .maybeSingle();

  let userId = existing?.id;
  let created = false;

  if (!userId) {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { role: "admin", name: displayName },
    });
    if (authError) throw authError;
    userId = authData.user.id;
    created = true;
  } else {
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { role: "admin", name: displayName },
    });
    if (authError) throw authError;
  }

  const { error: upsertError } = await admin.from("users").upsert(
    {
      id: userId,
      email,
      name: displayName,
      role: "admin",
      metadata: permissionsToMetadata(
        (existing?.metadata as Record<string, unknown> | undefined) ?? {},
        input.adminPermissions,
      ),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (upsertError) throw upsertError;

  return { userId, created };
}

export async function deleteUser(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}
