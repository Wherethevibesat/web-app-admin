import { businessPortalUrl, adminPortalUrl } from "@/lib/email/send";
import {
  getImpersonationSecret,
  signImpersonationPayload,
  type ImpersonationPayload,
} from "@/lib/impersonation-token";
import { getUser } from "@/lib/admin/users";
import { createAdminClient } from "@/lib/supabase/admin";

const BUSINESS_ROLES = ["venueOwner", "driver", "promoter"] as const;

export type BusinessRole = (typeof BUSINESS_ROLES)[number];

export function isBusinessRole(role: string): role is BusinessRole {
  return (BUSINESS_ROLES as readonly string[]).includes(role);
}

export async function createBusinessImpersonationUrl(params: {
  adminId: string;
  userId: string;
}): Promise<{ url: string; role: BusinessRole; email: string; name: string }> {
  const secret = getImpersonationSecret();
  if (!secret) {
    throw new Error(
      "IMPERSONATION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set for impersonation.",
    );
  }

  const profile = await getUser(params.userId);
  if (!profile) {
    throw new Error("User not found.");
  }
  if (!isBusinessRole(profile.role)) {
    throw new Error(
      "Only venue owners, promoters, and drivers can be opened in the business portal.",
    );
  }

  const admin = createAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.getUserById(
    params.userId,
  );
  if (authError || !authData.user?.email) {
    throw new Error("Could not load auth account for this user.");
  }

  await admin.auth.admin.updateUserById(params.userId, {
    user_metadata: {
      ...(authData.user.user_metadata ?? {}),
      role: profile.role,
      name: profile.name,
    },
  });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: authData.user.email,
  });
  if (linkError) {
    throw new Error(linkError.message);
  }

  const tokenHash = linkData.properties?.hashed_token;
  if (!tokenHash) {
    throw new Error("Could not create a one-time sign-in token.");
  }

  const payload: ImpersonationPayload = {
    v: 1,
    exp: Math.floor(Date.now() / 1000) + 120,
    admin_id: params.adminId,
    target_user_id: params.userId,
    target_email: profile.email,
    target_name: profile.name,
    role: profile.role,
    token_hash: tokenHash,
    admin_return_url: adminPortalUrl("/"),
  };

  const token = signImpersonationPayload(payload, secret);
  const url = `${businessPortalUrl("/auth/impersonate")}?token=${encodeURIComponent(token)}`;

  return {
    url,
    role: profile.role,
    email: profile.email,
    name: profile.name,
  };
}
