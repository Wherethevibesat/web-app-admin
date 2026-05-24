import { businessPortalUrl, customerPortalUrl, sendEmailSafe } from "@/lib/email/send";

function layout(title: string, body: string) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
${body}
<p style="margin-top:32px;font-size:12px;color:#666">Where The Vibes At · wherethevibesat.com</p>
</body></html>`;
}

export function notifyPromoterVenueLink(params: {
  promoterEmail: string;
  promoterName: string;
  venueName: string;
  approved: boolean;
}) {
  const body = params.approved
    ? `<p>You can now create offers and events for <strong>${params.venueName}</strong>.</p>
<p><a href="${businessPortalUrl("/promoter/venues")}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Open promoter portal</a></p>`
    : `<p>Your request to partner with <strong>${params.venueName}</strong> was not approved at this time.</p>`;

  sendEmailSafe({
    to: params.promoterEmail,
    subject: params.approved
      ? `Approved: ${params.venueName}`
      : `Venue request update: ${params.venueName}`,
    html: layout(`Hi ${params.promoterName || "there"},`, body),
    text: params.approved
      ? `You're approved to promote at ${params.venueName}.`
      : `Your venue request for ${params.venueName} was not approved.`,
  });
}

export function notifyPromoterEventReview(params: {
  promoterEmail: string;
  promoterName: string;
  eventTitle: string;
  venueName: string;
  approved: boolean;
}) {
  const body = params.approved
    ? `<p>Your event <strong>${params.eventTitle}</strong> at <strong>${params.venueName}</strong> was approved and is live on WTVA.</p>`
    : `<p>Your event <strong>${params.eventTitle}</strong> at <strong>${params.venueName}</strong> was not approved.</p>`;

  sendEmailSafe({
    to: params.promoterEmail,
    subject: params.approved
      ? `Event approved: ${params.eventTitle}`
      : `Event not approved: ${params.eventTitle}`,
    html: layout(`Hi ${params.promoterName || "there"},`, body),
    text: params.approved
      ? `Event "${params.eventTitle}" at ${params.venueName} is approved.`
      : `Event "${params.eventTitle}" at ${params.venueName} was not approved.`,
  });
}

export function notifyPromoterWelcome(params: {
  email: string;
  name: string;
  venueName?: string;
}) {
  const body = `<p>Your WTVA promoter account is ready.</p>
${params.venueName ? `<p>You've been linked to <strong>${params.venueName}</strong>.</p>` : ""}
<p><a href="${businessPortalUrl("/auth/login?role=promoter")}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Sign in to promoter portal</a></p>
<p style="font-size:13px;color:#666">Use "Forgot password" on first sign-in if you don't have a password yet.</p>`;

  sendEmailSafe({
    to: params.email,
    subject: "Welcome to WTVA Promoters",
    html: layout(`Hi ${params.name || "there"},`, body),
    text: `Your WTVA promoter account is ready. Sign in: ${businessPortalUrl("/auth/login?role=promoter")}`,
  });
}
