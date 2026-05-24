import { businessPortalUrl, sendEmailSafe } from "@/lib/email/send";

function layout(title: string, body: string) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
${body}
<p style="margin-top:32px;font-size:12px;color:#666">Where The Vibes At · wherethevibesat.com</p>
</body></html>`;
}

export function notifyDriverListingPublished(params: {
  ownerEmail: string;
  ownerName: string;
  companyName: string;
}) {
  const body = `<p>Your listing for <strong>${params.companyName}</strong> is now live on WTVA.</p>
<p>Customers can browse your fleet and book rides.</p>
<p><a href="${businessPortalUrl("/driver")}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Open driver portal</a></p>`;

  sendEmailSafe({
    to: params.ownerEmail,
    subject: `Listing approved: ${params.companyName}`,
    html: layout(`Hi ${params.ownerName || "there"},`, body),
    text: `Your driver listing for ${params.companyName} is live. Portal: ${businessPortalUrl("/driver")}`,
  });
}

export function notifyDriverListingDeactivated(params: {
  ownerEmail: string;
  ownerName: string;
  companyName: string;
}) {
  const body = `<p>Your listing for <strong>${params.companyName}</strong> has been deactivated and is hidden from customers.</p>
<p>Contact WTVA support if you have questions, or update your listing in the driver portal.</p>
<p><a href="${businessPortalUrl("/driver")}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Open driver portal</a></p>`;

  sendEmailSafe({
    to: params.ownerEmail,
    subject: `Listing deactivated: ${params.companyName}`,
    html: layout(`Hi ${params.ownerName || "there"},`, body),
    text: `Your driver listing for ${params.companyName} was deactivated. Portal: ${businessPortalUrl("/driver")}`,
  });
}
