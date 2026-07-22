import { createAdminClient } from "@/lib/supabase/admin";
import { sendBroadcastEmail } from "@/lib/email/admin-broadcast";
import { isFcmConfigured, sendFcmPush } from "@/lib/push/fcm";
import type { UserRole } from "@/lib/types/database";

export type MessageAudience = "customer" | "driver" | "venueOwner" | "promoter";
export type MessageChannel = "email" | "in_app" | "push";

export type AdminMessageCampaign = {
  id: string;
  subject: string;
  body: string;
  image_url: string | null;
  audience: MessageAudience;
  channels: string[];
  status: string;
  created_by: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  sent_at: string | null;
};

export type SupportThreadRow = {
  id: string;
  last_message_at: string;
  preview: string | null;
  user: { id: string; name: string; email: string; role: string };
};

type Recipient = { id: string; email: string; name: string };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function listCampaigns(): Promise<AdminMessageCampaign[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_message_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as AdminMessageCampaign[];
}

export async function getCampaign(id: string): Promise<AdminMessageCampaign | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_message_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as AdminMessageCampaign | null;
}

export async function resolveAudienceRecipients(audience: MessageAudience): Promise<Recipient[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, email, name")
    .eq("role", audience)
    .order("email", { ascending: true });
  if (error) throw error;
  return (data ?? []).filter((u) => u.email) as Recipient[];
}

export async function createCampaign(input: {
  subject: string;
  body: string;
  imageUrl?: string | null;
  audience: MessageAudience;
  channels: MessageChannel[];
  createdBy: string;
}) {
  const admin = createAdminClient();
  const recipients = await resolveAudienceRecipients(input.audience);
  const { data, error } = await admin
    .from("admin_message_campaigns")
    .insert({
      subject: input.subject.trim(),
      body: input.body.trim(),
      image_url: input.imageUrl?.trim() || null,
      audience: input.audience,
      channels: input.channels,
      status: "draft",
      created_by: input.createdBy,
      recipient_count: recipients.length,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminMessageCampaign;
}

export async function sendCampaign(campaignId: string): Promise<{
  sent: number;
  failed: number;
}> {
  const admin = createAdminClient();
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status === "sent") throw new Error("Campaign already sent");

  const channels = (campaign.channels ?? ["email"]) as MessageChannel[];
  const recipients = await resolveAudienceRecipients(campaign.audience as MessageAudience);

  await admin
    .from("admin_message_campaigns")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  let sent = 0;
  let failed = 0;
  const pauseEvery = Math.max(Number(process.env.MESSAGE_SEND_PAUSE_EVERY ?? 50), 1);
  const pauseMs = Math.max(Number(process.env.MESSAGE_SEND_PAUSE_MS ?? 1500), 0);

  for (let i = 0; i < recipients.length; i += 1) {
    const recipient = recipients[i];
    for (const channel of channels) {
      try {
        if (channel === "email") {
          const result = await sendBroadcastEmail({
            to: recipient.email,
            subject: campaign.subject,
            body: campaign.body,
            imageUrl: campaign.image_url,
            recipientName: recipient.name,
          });
          if (!result.ok) throw new Error("Email send failed");
        } else if (channel === "in_app") {
          const { error: notifErr } = await admin.from("user_notifications").insert({
            user_id: recipient.id,
            title: campaign.subject,
            body: campaign.body,
            image_url: campaign.image_url,
            link: "/",
            campaign_id: campaignId,
          });
          if (notifErr) throw notifErr;
        } else if (channel === "push") {
          if (!isFcmConfigured()) {
            throw new Error("Push is not configured (set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)");
          }

          const { data: tokens, error: tokenErr } = await admin
            .from("device_push_tokens")
            .select("id, token")
            .eq("user_id", recipient.id)
            .eq("enabled", true);
          if (tokenErr) throw tokenErr;
          if (!tokens?.length) {
            throw new Error("No push token registered for this user");
          }

          let anyOk = false;
          const errors: string[] = [];
          for (const row of tokens) {
            const result = await sendFcmPush({
              token: row.token,
              title: campaign.subject,
              body: campaign.body,
              imageUrl: campaign.image_url,
              data: {
                campaign_id: campaignId,
                type: "broadcast",
              },
            });
            if (result.ok) {
              anyOk = true;
              await admin
                .from("device_push_tokens")
                .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                .eq("id", row.id);
            } else {
              errors.push(result.error ?? "Push failed");
              if (result.invalidToken) {
                await admin
                  .from("device_push_tokens")
                  .update({ enabled: false, updated_at: new Date().toISOString() })
                  .eq("id", row.id);
              }
            }
          }
          if (!anyOk) {
            throw new Error(errors[0] ?? "Push send failed");
          }

          // Keep inbox in sync when push is used without a separate in_app channel
          if (!channels.includes("in_app")) {
            await admin.from("user_notifications").insert({
              user_id: recipient.id,
              title: campaign.subject,
              body: campaign.body,
              image_url: campaign.image_url,
              link: "/",
              campaign_id: campaignId,
            });
          }
        }

        await admin.from("admin_message_deliveries").insert({
          campaign_id: campaignId,
          user_id: recipient.id,
          email: recipient.email,
          channel,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
        sent += 1;
      } catch (err) {
        failed += 1;
        await admin.from("admin_message_deliveries").insert({
          campaign_id: campaignId,
          user_id: recipient.id,
          email: recipient.email,
          channel,
          status: "failed",
          error: err instanceof Error ? err.message : "Delivery failed",
        });
      }
    }

    if (pauseMs > 0 && (i + 1) % pauseEvery === 0 && i + 1 < recipients.length) {
      await sleep(pauseMs);
    }
  }

  await admin
    .from("admin_message_campaigns")
    .update({
      status: failed > 0 && sent === 0 ? "failed" : "sent",
      sent_count: sent,
      failed_count: failed,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return { sent, failed };
}

export async function listSupportThreads(): Promise<SupportThreadRow[]> {
  const admin = createAdminClient();
  const { data: threads, error } = await admin
    .from("chat_threads")
    .select("id, last_message_at, title")
    .eq("kind", "support")
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  const rows: SupportThreadRow[] = [];
  for (const t of threads ?? []) {
    const { data: parts } = await admin
      .from("chat_participants")
      .select("user:users(id, name, email, role)")
      .eq("thread_id", t.id);
    const users = (parts ?? [])
      .map((p) => {
        const raw = p.user as
          | { id: string; name: string; email: string; role: string }
          | { id: string; name: string; email: string; role: string }[]
          | null;
        return Array.isArray(raw) ? raw[0] ?? null : raw;
      })
      .filter((u): u is { id: string; name: string; email: string; role: string } => Boolean(u));
    const endUser = users.find((u) => u.role !== "admin") ?? users[0];
    if (!endUser) continue;

    const { data: lastMsg } = await admin
      .from("chat_messages")
      .select("body")
      .eq("thread_id", t.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    rows.push({
      id: t.id,
      last_message_at: t.last_message_at,
      preview: lastMsg?.body ?? null,
      user: endUser,
    });
  }
  return rows;
}

export async function findOrCreateSupportThread(
  adminUserId: string,
  targetUserId: string,
): Promise<string> {
  const admin = createAdminClient();
  const { data: target } = await admin
    .from("users")
    .select("id, name, role")
    .eq("id", targetUserId)
    .maybeSingle();
  if (!target) throw new Error("User not found");

  const { data: adminParts } = await admin
    .from("chat_participants")
    .select("thread_id")
    .eq("user_id", adminUserId);
  const adminThreadIds = (adminParts ?? []).map((p) => p.thread_id);

  if (adminThreadIds.length) {
    const { data: shared } = await admin
      .from("chat_participants")
      .select("thread_id")
      .eq("user_id", targetUserId)
      .in("thread_id", adminThreadIds);
    for (const s of shared ?? []) {
      const { data: thread } = await admin
        .from("chat_threads")
        .select("id")
        .eq("id", s.thread_id)
        .eq("kind", "support")
        .maybeSingle();
      if (thread) return thread.id;
    }
  }

  const { data: thread, error } = await admin
    .from("chat_threads")
    .insert({
      kind: "support",
      title: `Support · ${target.name}`,
    })
    .select("id")
    .single();
  if (error) throw error;

  await admin.from("chat_participants").insert([
    { thread_id: thread.id, user_id: adminUserId },
    { thread_id: thread.id, user_id: targetUserId },
  ]);

  return thread.id as string;
}

export async function listThreadMessages(threadId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_messages")
    .select("id, sender_id, body, created_at, sender:users(name, role)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendSupportMessage(
  adminUserId: string,
  threadId: string,
  body: string,
) {
  const admin = createAdminClient();
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message body required");

  const { error } = await admin.from("chat_messages").insert({
    thread_id: threadId,
    sender_id: adminUserId,
    body: trimmed,
  });
  if (error) throw error;

  await admin
    .from("chat_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", threadId);
}

export async function searchUsersForSupport(q: string, roles?: UserRole[]) {
  const admin = createAdminClient();
  let query = admin.from("users").select("id, name, email, role").order("name");
  if (roles?.length) query = query.in("role", roles);
  const { data, error } = await query.limit(50);
  if (error) throw error;
  const term = q.trim().toLowerCase();
  if (!term) return (data ?? []).filter((u) => u.role !== "admin").slice(0, 20);
  return (data ?? []).filter(
    (u) =>
      u.role !== "admin" &&
      (u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)),
  );
}
