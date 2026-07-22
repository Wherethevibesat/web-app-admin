import { JWT } from "google-auth-library";

export type FcmSendResult = {
  ok: boolean;
  error?: string;
  invalidToken?: boolean;
};

function fcmConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() &&
      process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
      process.env.FIREBASE_PRIVATE_KEY?.trim(),
  );
}

export function isFcmConfigured(): boolean {
  return fcmConfigured();
}

async function getAccessToken(): Promise<string> {
  const email = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error("Firebase service account is not configured");
  }

  const client = new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const tokens = await client.authorize();
  if (!tokens.access_token) {
    throw new Error("Failed to obtain FCM access token");
  }
  return tokens.access_token;
}

/** Send a single FCM notification to a device token (HTTP v1). */
export async function sendFcmPush(input: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string | null;
}): Promise<FcmSendResult> {
  if (!fcmConfigured()) {
    return { ok: false, error: "FCM is not configured (set FIREBASE_* env vars)" };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID!.trim();

  try {
    const accessToken = await getAccessToken();
    const data: Record<string, string> = {
      ...(input.data ?? {}),
    };
    if (input.imageUrl) data.image_url = input.imageUrl;

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: input.token,
            notification: {
              title: input.title,
              body: input.body,
              ...(input.imageUrl ? { image: input.imageUrl } : {}),
            },
            data,
            android: {
              priority: "HIGH",
              notification: {
                sound: "default",
                channelId: "wtva_default",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: 1,
                },
              },
            },
          },
        }),
      },
    );

    if (res.ok) return { ok: true };

    const text = await res.text();
    let invalidToken = false;
    try {
      const json = JSON.parse(text) as {
        error?: { details?: Array<{ errorCode?: string }>; message?: string };
      };
      const code = json.error?.details?.find((d) => d.errorCode)?.errorCode;
      invalidToken =
        code === "UNREGISTERED" ||
        code === "INVALID_ARGUMENT" ||
        /not a valid fcm registration token/i.test(json.error?.message ?? "");
    } catch {
      // ignore parse errors
    }

    return {
      ok: false,
      error: text.slice(0, 500) || `FCM HTTP ${res.status}`,
      invalidToken,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "FCM send failed",
    };
  }
}
