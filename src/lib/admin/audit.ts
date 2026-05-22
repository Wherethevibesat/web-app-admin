import { createAdminClient } from "@/lib/supabase/admin";

export async function logAdminAction(params: {
  adminId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("admin_audit_log").insert({
      admin_id: params.adminId,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      payload: params.payload ?? {},
    });
  } catch (err) {
    console.error("audit log skipped:", err);
  }
}
