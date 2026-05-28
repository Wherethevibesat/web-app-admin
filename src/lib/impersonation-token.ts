import { createHmac, timingSafeEqual } from "crypto";

export type ImpersonationPayload = {
  v: 1;
  exp: number;
  admin_id: string;
  target_user_id: string;
  target_email: string;
  target_name: string;
  role: "venueOwner" | "driver" | "promoter";
  token_hash: string;
  admin_return_url: string;
};

export function getImpersonationSecret(): string {
  return (
    process.env.IMPERSONATION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}

export function signImpersonationPayload(
  payload: ImpersonationPayload,
  secret: string,
): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyImpersonationToken(
  token: string,
  secret: string,
): ImpersonationPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  try {
    if (
      !timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as ImpersonationPayload;
    if (data.v !== 1 || !data.exp || data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
