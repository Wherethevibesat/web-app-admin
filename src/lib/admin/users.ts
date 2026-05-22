import { createAdminClient } from "@/lib/supabase/admin";
import type { UserProfile, UserRole } from "@/lib/types/database";

export async function listUsers(search?: string): Promise<UserProfile[]> {
  const admin = createAdminClient();
  const { data: users, error } = await admin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: rankings } = await admin.from("user_rankings").select("user_id, total_points");

  const pointsMap = new Map(
    (rankings ?? []).map((r) => [r.user_id, r.total_points as number]),
  );

  let rows = (users ?? []).map((u) => ({
    ...u,
    total_points: pointsMap.get(u.id) ?? 0,
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

  const { data: rank } = await admin
    .from("user_rankings")
    .select("total_points")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    ...data,
    total_points: rank?.total_points ?? 0,
  } as UserProfile;
}

export async function updateUserRole(userId: string, role: UserRole) {
  await updateUser(userId, { role });
}

export async function updateUser(
  userId: string,
  fields: { name?: string; email?: string; role?: UserRole },
) {
  const admin = createAdminClient();
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.name !== undefined) payload.name = fields.name.trim();
  if (fields.email !== undefined) payload.email = fields.email.trim().toLowerCase();
  if (fields.role !== undefined) payload.role = fields.role;

  const { error } = await admin.from("users").update(payload).eq("id", userId);
  if (error) throw error;

  if (fields.email !== undefined) {
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      email: fields.email.trim().toLowerCase(),
    });
    if (authError) throw authError;
  }
}

export async function deleteUser(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}
