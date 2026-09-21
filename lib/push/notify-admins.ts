import { sendFcmToToken } from "@/lib/push/fcm-client";
import { deleteAdminPushTokenValue, listAdminPushTokens } from "@/lib/supabase/admin-push-tokens-repo";

export type AdminAlertKind = "portal_access" | "product_order" | "service_request";

export type AdminAlert = {
  kind: AdminAlertKind;
  title: string;
  body: string;
  url: string;
};

export async function notifyLoggedInAdmins(alert: AdminAlert): Promise<void> {
  const tokens = await listAdminPushTokens();
  if (tokens.length === 0) return;

  for (const token of tokens) {
    try {
      const result = await sendFcmToToken({
        token,
        title: alert.title,
        body: alert.body,
        url: alert.url,
        androidChannelId: "admin_alerts",
        data: {
          type: "admin_alert",
          kind: alert.kind,
        },
      });
      if (result === "unregistered") {
        await deleteAdminPushTokenValue(token);
      }
    } catch (error) {
      console.error("Admin FCM send failed:", error);
    }
  }
}

export async function notifyLoggedInAdminsBestEffort(alert: AdminAlert): Promise<void> {
  try {
    await notifyLoggedInAdmins(alert);
  } catch (error) {
    console.error("notifyLoggedInAdmins failed:", error);
  }
}
