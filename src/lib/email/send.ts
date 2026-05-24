import { Resend } from "resend";

export function emailFromAddress() {
  return process.env.EMAIL_FROM ?? "WTVA <notifications@wherethevibesat.com>";
}

export function businessPortalUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_BUSINESS_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://business.wherethevibesat.com";
  const normalized = base.replace(/\/$/, "");
  return `${normalized}${path.startsWith("/") ? path : `/${path}`}`;
}

export function customerPortalUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ??
    "https://wherethevibesat.com";
  const normalized = base.replace(/\/$/, "");
  return `${normalized}${path.startsWith("/") ? path : `/${path}`}`;
}

export function adminPortalUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_ADMIN_APP_URL ??
    "http://localhost:3000";
  const normalized = base.replace(/\/$/, "");
  return `${normalized}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — skipped:", opts.subject);
    return { ok: false as const, skipped: true };
  }

  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: emailFromAddress(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  if (error) {
    console.error("[email] send failed:", opts.subject, error);
    return { ok: false as const, error };
  }
  return { ok: true as const };
}

export function sendEmailSafe(opts: Parameters<typeof sendEmail>[0]) {
  void sendEmail(opts).catch((err) => console.error("[email] unexpected error:", err));
}
