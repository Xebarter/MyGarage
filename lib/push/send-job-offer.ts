import { createSign } from "crypto";
import { deletePushTokenValue, listPushTokensForVendor } from "@/lib/supabase/vendor-push-tokens-repo";

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

export type JobOfferPushPayload = {
  vendorId: string;
  assignmentId: string;
  requestId: string;
  service: string;
  location: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
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

async function sendHttpV1(token: string, payload: JobOfferPushPayload, accessToken: string): Promise<boolean> {
  const projectId = firebaseProjectId();
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        android: {
          priority: "high",
          ttl: "90s",
        },
        apns: {
          headers: { "apns-priority": "10" },
          payload: { aps: { sound: "default", "content-available": 1 } },
        },
        data: {
          type: "job_offer",
          assignmentId: payload.assignmentId,
          requestId: payload.requestId,
          service: payload.service,
          location: payload.location,
          destinationLat: payload.destinationLat != null ? String(payload.destinationLat) : "",
          destinationLng: payload.destinationLng != null ? String(payload.destinationLng) : "",
        },
        notification: {
          title: payload.service || "Job offer",
          body: payload.location || "Open to accept or decline",
        },
      },
    }),
  });
  if (res.ok) return true;
  const text = await res.text().catch(() => "");
  if (res.status === 404 || text.includes("UNREGISTERED") || text.includes("NOT_FOUND")) {
    await deletePushTokenValue(token);
    return false;
  }
  console.error("FCM v1 send failed:", res.status, text);
  return false;
}

async function sendLegacy(token: string, payload: JobOfferPushPayload, serverKey: string): Promise<boolean> {
  const res = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${serverKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      priority: "high",
      time_to_live: 90,
      notification: {
        title: payload.service || "Job offer",
        body: payload.location || "Open to accept or decline",
        android_channel_id: "job_offers_alarm_v2",
      },
      data: {
        type: "job_offer",
        assignmentId: payload.assignmentId,
        requestId: payload.requestId,
        service: payload.service,
        location: payload.location,
        destinationLat: payload.destinationLat != null ? String(payload.destinationLat) : "",
        destinationLng: payload.destinationLng != null ? String(payload.destinationLng) : "",
      },
    }),
  });
  if (!res.ok) {
    console.error("FCM legacy send failed:", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

export async function notifyVendorOfJobOffer(payload: JobOfferPushPayload): Promise<void> {
  const tokens = await listPushTokensForVendor(payload.vendorId);
  if (tokens.length === 0) return;

  const account = readServiceAccount();
  const accessToken = account ? await googleAccessToken(account) : null;
  const serverKey = process.env.FIREBASE_FCM_SERVER_KEY?.trim() || "";

  if (!accessToken && !serverKey) {
    console.error("Job offer push skipped: set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_FCM_SERVER_KEY");
    return;
  }

  for (const token of tokens) {
    try {
      if (accessToken) {
        await sendHttpV1(token, payload, accessToken);
      } else {
        await sendLegacy(token, payload, serverKey);
      }
    } catch (error) {
      console.error("Job offer push failed:", error);
    }
  }
}

export async function notifyVendorOfJobOfferBestEffort(payload: JobOfferPushPayload): Promise<void> {
  try {
    await notifyVendorOfJobOffer(payload);
  } catch (error) {
    console.error("notifyVendorOfJobOffer failed:", error);
  }
}
