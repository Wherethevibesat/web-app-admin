import { customerPortalUrl, sendEmail } from "@/lib/email/send";

function isSafeImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function layout(title: string, bodyHtml: string) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
${bodyHtml}
<p style="margin-top:32px;font-size:12px;color:#666">Where The Vibes At · wherethevibesat.com</p>
</body></html>`;
}

export async function sendBroadcastEmail(opts: {
  to: string;
  subject: string;
  body: string;
  imageUrl?: string | null;
  recipientName?: string;
}) {
  const greeting = opts.recipientName ? `Hi ${opts.recipientName},` : "Hi there,";
  const imageBlock =
    opts.imageUrl && isSafeImageUrl(opts.imageUrl)
      ? `<p style="margin:16px 0"><img src="${opts.imageUrl}" alt="" style="max-width:100%;height:auto;border-radius:8px" /></p>`
      : "";
  const bodyHtml = `<p>${greeting}</p>
<p>${opts.body.replace(/\n/g, "<br>")}</p>
${imageBlock}
<p><a href="${customerPortalUrl("/")}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Open WTVA</a></p>`;

  return sendEmail({
    to: opts.to,
    subject: opts.subject,
    html: layout(opts.subject, bodyHtml),
    text: `${greeting}\n\n${opts.body}\n\nOpen WTVA: ${customerPortalUrl("/")}`,
  });
}
