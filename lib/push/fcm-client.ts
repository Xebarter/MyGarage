import { createSign } from "crypto";

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

export type FcmSendResult = "ok" | "unregistered" | "error";

export type FcmMessage = {
  token: string;
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
  androidChannelId?: string;
};

function firebaseProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    "mygarage-2688a"
  );
}

function readServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

function base64Url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

async function googleAccessToken(account: ServiceAccount): Promise<string | null> {
  if (!account.client_email || !account.private_key) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const signature = signer.sign(account.private_key.replace(/\\n/g, "\n"), "base64url");
  const assertion = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    console.error("FCM access token failed:", res.status, await res.text().catch(() => ""));
    return null;
  }
  const json = (await res.json()) as { access_token?: string };
  return json.access_token || null;
}

async function sendHttpV1(message: FcmMessage, accessToken: string): Promise<FcmSendResult> {
  const projectId = firebaseProjectId();
  const data: Record<string, string> = {
    title: message.title,
    body: message.body,
    url: message.url ?? "/admin",
    ...(message.data ?? {}),
  };
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token: message.token,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channel_id: message.androidChannelId || "admin_alerts",
          },
        },
        apns: {
          payload: { aps: { sound: "default", "content-available": 1 } },
        },
        webpush: {
          headers: { Urgency: "high" },
          notification: {
            title: message.title,
            body: message.body,
            icon: "/icon0.svg",
            badge: "/icon0.svg",
            requireInteraction: true,
          },
          fcm_options: {
            link: message.url || "/admin",
          },
        },
        notification: {
          title: message.title,
          body: message.body,
        },
        data,
      },
    }),
  });
  if (res.ok) return "ok";
  const text = await res.text().catch(() => "");
  if (res.status === 404 || text.includes("UNREGISTERED") || text.includes("NOT_FOUND")) {
    return "unregistered";
  }
  console.error("FCM v1 send failed:", res.status, text);
  return "error";
}

export async function sendFcmToToken(message: FcmMessage): Promise<FcmSendResult> {
  const token = message.token.trim();
  if (!token) return "error";
  const account = readServiceAccount();
  const accessToken = account ? await googleAccessToken(account) : null;
  if (!accessToken) {
    console.error("FCM send skipped: set FIREBASE_SERVICE_ACCOUNT_JSON");
    return "error";
  }
  return sendHttpV1({ ...message, token }, accessToken);
}
