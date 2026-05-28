import { createAdminClient } from "@/lib/supabase/admin";
import { customerPortalUrl, sendEmail } from "@/lib/email/send";
import type { UserProfile } from "@/lib/types/database";

export type CustomerImportPreview = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  existingUsers: number;
  wouldImport: number;
  errors: Array<{ row: number; message: string }>;
};

export type ParsedCustomerRow = {
  row: number;
  email: string;
  name: string;
};

export type CustomerInviteQueueStats = {
  pending_invite: number;
  invited: number;
  activated: number;
  failed: number;
  retryable_failed: number;
  max_attempts_reached: number;
  unsubscribed: number;
  maxAttempts: number;
};

export function getMaxInviteAttempts() {
  return Math.max(Number(process.env.CUSTOMER_INVITE_MAX_ATTEMPTS ?? 3), 1);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

export function parseCustomersCsv(csvText: string): ParsedCustomerRow[] {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const headerCols = parseCsvLine(lines[0]).map((c) => c.toLowerCase().trim());
  const emailIdx = headerCols.findIndex((c) => c === "email");
  const nameIdx = headerCols.findIndex((c) => c === "name" || c === "full_name");
  if (emailIdx === -1) {
    throw new Error("CSV must include an 'email' column");
  }

  const rows: ParsedCustomerRow[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i]);
    const email = (cols[emailIdx] ?? "").trim().toLowerCase();
    const fallback = email.includes("@") ? email.split("@")[0] : "Customer";
    const name = (nameIdx >= 0 ? cols[nameIdx] : "")?.trim() || fallback;
    rows.push({ row: i + 1, email, name });
  }
  return rows;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function listCustomers(search?: string): Promise<UserProfile[]> {
  const admin = createAdminClient();
  let query = admin
    .from("users")
    .select("*")
    .eq("role", "customer")
    .order("created_at", { ascending: false });
  if (search?.trim()) {
    const q = search.trim();
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

export async function previewCustomerImport(rows: ParsedCustomerRow[]): Promise<CustomerImportPreview> {
  const errors: Array<{ row: number; message: string }> = [];
  const seen = new Set<string>();
  const validRows: ParsedCustomerRow[] = [];
  let duplicateRows = 0;

  for (const row of rows) {
    if (!row.email) {
      errors.push({ row: row.row, message: "Missing email" });
      continue;
    }
    if (!EMAIL_RE.test(row.email)) {
      errors.push({ row: row.row, message: "Invalid email format" });
      continue;
    }
    if (seen.has(row.email)) {
      duplicateRows += 1;
      errors.push({ row: row.row, message: "Duplicate email in file" });
      continue;
    }
    seen.add(row.email);
    validRows.push(row);
  }

  const admin = createAdminClient();
  const emails = validRows.map((r) => r.email);
  const existingUserEmails = new Set<string>();
  for (const piece of chunk(emails, 500)) {
    const { data } = await admin.from("users").select("email").in("email", piece);
    for (const item of data ?? []) {
      if (item.email) existingUserEmails.add(String(item.email).toLowerCase());
    }
  }

  let existingUsers = 0;
  for (const row of validRows) {
    if (existingUserEmails.has(row.email)) {
      existingUsers += 1;
      errors.push({ row: row.row, message: "Already exists as user" });
    }
  }

  const wouldImport = validRows.length - existingUsers;
  return {
    totalRows: rows.length,
    validRows: validRows.length,
    invalidRows: errors.length,
    duplicateRows,
    existingUsers,
    wouldImport: Math.max(0, wouldImport),
    errors: errors.slice(0, 100),
  };
}

export async function importCustomerContacts(rows: ParsedCustomerRow[]): Promise<{
  batchId: string;
  inserted: number;
}> {
  const preview = await previewCustomerImport(rows);
  if (preview.wouldImport === 0) {
    return { batchId: crypto.randomUUID(), inserted: 0 };
  }

  const admin = createAdminClient();
  const batchId = crypto.randomUUID();
  const invalidRowSet = new Set(preview.errors.map((e) => e.row));
  const payload = rows
    .filter((r) => !invalidRowSet.has(r.row))
    .map((r) => ({
      email: r.email,
      name: r.name,
      status: "pending_invite" as const,
      import_batch_id: batchId,
      updated_at: new Date().toISOString(),
    }));

  if (payload.length === 0) {
    return { batchId, inserted: 0 };
  }

  const { error } = await admin
    .from("customer_import_contacts")
    .upsert(payload, { onConflict: "email" });
  if (error) throw error;

  return { batchId, inserted: payload.length };
}

export async function getCustomerInviteQueueStats(): Promise<CustomerInviteQueueStats> {
  const admin = createAdminClient();
  const maxAttempts = getMaxInviteAttempts();
  const { data, error } = await admin
    .from("customer_import_contacts")
    .select("status, invite_attempt_count");
  if (error) throw error;

  const stats: CustomerInviteQueueStats = {
    pending_invite: 0,
    invited: 0,
    activated: 0,
    failed: 0,
    retryable_failed: 0,
    max_attempts_reached: 0,
    unsubscribed: 0,
    maxAttempts,
  };
  for (const row of data ?? []) {
    switch (row.status) {
      case "pending_invite":
        stats.pending_invite += 1;
        break;
      case "invited":
        stats.invited += 1;
        break;
      case "activated":
        stats.activated += 1;
        break;
      case "failed": {
        stats.failed += 1;
        const attempts = Number(row.invite_attempt_count ?? 0);
        if (attempts >= maxAttempts) stats.max_attempts_reached += 1;
        else stats.retryable_failed += 1;
        break;
      }
      case "unsubscribed":
        stats.unsubscribed += 1;
        break;
      default:
        break;
    }
  }
  return stats;
}

export type StoppedCustomerContact = {
  email: string;
  name: string;
  invite_attempt_count: number;
  last_invite_attempt_at: string | null;
  error: string | null;
};

export async function listStoppedCustomerContacts(): Promise<StoppedCustomerContact[]> {
  const admin = createAdminClient();
  const maxAttempts = getMaxInviteAttempts();
  const { data, error } = await admin
    .from("customer_import_contacts")
    .select("email, name, invite_attempt_count, last_invite_attempt_at, metadata")
    .eq("status", "failed")
    .gte("invite_attempt_count", maxAttempts)
    .order("email", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const err = metadata.error;
    return {
      email: row.email,
      name: row.name,
      invite_attempt_count: Number(row.invite_attempt_count ?? 0),
      last_invite_attempt_at: row.last_invite_attempt_at,
      error: typeof err === "string" ? err : null,
    };
  });
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function stoppedContactsToCsv(rows: StoppedCustomerContact[]): string {
  const header = "email,name,invite_attempt_count,last_invite_attempt_at,error";
  const lines = rows.map((r) =>
    [
      csvEscape(r.email),
      csvEscape(r.name),
      String(r.invite_attempt_count),
      csvEscape(r.last_invite_attempt_at ?? ""),
      csvEscape(r.error ?? ""),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

function inviteEmailHtml(name: string) {
  const loginUrl = customerPortalUrl("/auth/login");
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">Welcome to Where The Vibes At</h1>
<p>Hi ${name || "there"},</p>
<p>Your account has been added to WTVA. Click below to sign in and finish setup.</p>
<p><a href="${loginUrl}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Open WTVA</a></p>
<p style="font-size:13px;color:#666">Use "Forgot password" on first sign-in if you do not have a password yet.</p>
<p style="margin-top:32px;font-size:12px;color:#666">Where The Vibes At · wherethevibesat.com</p>
</body></html>`;
}

export async function sendCustomerInvites(batchSize = 1000): Promise<{
  processed: number;
  invited: number;
  failed: number;
}> {
  return sendCustomerInvitesInternal({ batchSize, includeFailed: false });
}

export async function retryFailedCustomerInvites(batchSize = 1000): Promise<{
  processed: number;
  invited: number;
  failed: number;
}> {
  return sendCustomerInvitesInternal({ batchSize, includeFailed: true });
}

async function sendCustomerInvitesInternal(opts: {
  batchSize: number;
  includeFailed: boolean;
}): Promise<{
  processed: number;
  invited: number;
  failed: number;
}> {
  const admin = createAdminClient();
  const statuses = opts.includeFailed ? (["pending_invite", "failed"] as const) : (["pending_invite"] as const);
  const { data: contacts, error } = await admin
    .from("customer_import_contacts")
    .select("id, email, name, invite_attempt_count, last_invite_attempt_at, status")
    .in("status", [...statuses])
    .order("created_at", { ascending: true })
    .limit(opts.batchSize);
  if (error) throw error;

  const retryCooldownMinutes = Math.max(
    Number(process.env.CUSTOMER_INVITE_RETRY_COOLDOWN_MINUTES ?? 60),
    1,
  );
  const maxAttempts = Math.max(Number(process.env.CUSTOMER_INVITE_MAX_ATTEMPTS ?? 3), 1);
  const nowTs = Date.now();
  const eligibleContacts = (contacts ?? []).filter((contact) => {
    const attempts = Number(contact.invite_attempt_count ?? 0);
    if (attempts >= maxAttempts) return false;
    if (!opts.includeFailed || contact.status !== "failed") return true;
    if (!contact.last_invite_attempt_at) return true;
    const elapsedMinutes =
      (nowTs - new Date(contact.last_invite_attempt_at).getTime()) / (1000 * 60);
    return elapsedMinutes >= retryCooldownMinutes;
  });

  let invited = 0;
  let failed = 0;
  const pauseEvery = Math.max(Number(process.env.CUSTOMER_INVITE_PAUSE_EVERY ?? 50), 1);
  const pauseMs = Math.max(Number(process.env.CUSTOMER_INVITE_PAUSE_MS ?? 1500), 0);

  for (let i = 0; i < eligibleContacts.length; i += 1) {
    const contact = eligibleContacts[i];
    const nextAttemptCount = Number(contact.invite_attempt_count ?? 0) + 1;
    try {
      const normalizedEmail = String(contact.email).trim().toLowerCase();
      const displayName = String(contact.name || "").trim() || normalizedEmail.split("@")[0] || "Customer";
      const { data: existingUser } = await admin
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      let userId = existingUser?.id;
      if (!userId) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
          user_metadata: { role: "customer", name: displayName },
        });
        if (createErr) throw createErr;
        userId = created.user.id;
      }

      const { error: upsertUserErr } = await admin.from("users").upsert(
        {
          id: userId,
          email: normalizedEmail,
          name: displayName,
          role: "customer",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (upsertUserErr) throw upsertUserErr;

      const emailResult = await sendEmail({
        to: normalizedEmail,
        subject: "Your WTVA account is ready",
        html: inviteEmailHtml(displayName),
        text: `Hi ${displayName}, your WTVA account is ready. Sign in: ${customerPortalUrl("/auth/login")} (use Forgot password on first sign-in).`,
      });
      if (!emailResult.ok) {
        throw new Error("Email provider rejected invite");
      }

      await admin
        .from("customer_import_contacts")
        .update({
          status: "invited",
          invite_attempt_count: nextAttemptCount,
          last_invite_attempt_at: new Date().toISOString(),
          metadata: {
            invited_at: new Date().toISOString(),
            last_error: null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", contact.id);
      invited += 1;
    } catch (err) {
      await admin
        .from("customer_import_contacts")
        .update({
          status: "failed",
          invite_attempt_count: nextAttemptCount,
          last_invite_attempt_at: new Date().toISOString(),
          metadata: {
            error: err instanceof Error ? err.message : "Invite failed",
            failed_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", contact.id);
      failed += 1;
    }

    // Friendly provider pacing for high-volume batches.
    if (pauseMs > 0 && (i + 1) % pauseEvery === 0 && i + 1 < eligibleContacts.length) {
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
  }

  return {
    processed: eligibleContacts.length,
    invited,
    failed,
  };
}
