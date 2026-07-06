import type {
  BuyerAccountDetails,
  BuyerAnalyticsSummary,
  BuyerAppPreferences,
  BuyerNotification,
  BuyerNotificationPreferences,
  BuyerPaymentRecord,
  BuyerVehicleDocument,
  DocumentType,
  PreferredContactMethod,
  RecommendationStatus,
  ServiceProviderRecommendation,
  ServiceRequestMessage,
} from "@/lib/buyer-control-center";
import { createAdminClient } from "@/lib/supabase/admin";
import * as buyerServicesRepo from "@/lib/supabase/buyer-services-repo";
import * as buyerVehiclesRepo from "@/lib/supabase/buyer-vehicles-repo";
import * as vehicleServiceHistoryRepo from "@/lib/supabase/vehicle-service-history-repo";
import * as buyerSubscriptionsRepo from "@/lib/supabase/buyer-subscriptions-repo";

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultNotificationPreferences(customerId: string): BuyerNotificationPreferences {
  return {
    customerId,
    emailEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    serviceUpdates: true,
    maintenanceReminders: true,
    marketing: false,
  };
}

function defaultAppPreferences(customerId: string): BuyerAppPreferences {
  return {
    customerId,
    preferredProviderIds: [],
    serviceMode: "both",
    language: "en",
    region: "UG",
    distanceUnit: "km",
    currency: "UGX",
    theme: "system",
  };
}

export async function getBuyerAccountDetails(customerId: string): Promise<BuyerAccountDetails | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("preferred_contact_method, account_status, deactivated_at, email, phone")
    .eq("id", customerId)
    .maybeSingle();

  if (error) throw new Error(`getBuyerAccountDetails failed: ${error.message}`);
  if (!data) return null;

  const email = String(data.email ?? "").trim();
  const phone = String(data.phone ?? "").trim();

  return {
    preferredContactMethod: (data.preferred_contact_method as PreferredContactMethod) ?? "email",
    accountStatus: (data.account_status as "active" | "deactivated") ?? "active",
    deactivatedAt: data.deactivated_at ? new Date(data.deactivated_at) : null,
    emailVerified: email.includes("@"),
    phoneVerified: phone.length >= 9,
  };
}

export async function updateBuyerAccountDetails(
  customerId: string,
  patch: Partial<{ preferredContactMethod: PreferredContactMethod; accountStatus: "active" | "deactivated" }>,
): Promise<void> {
  const supabase = createAdminClient();
  const row: Record<string, unknown> = {};
  if (patch.preferredContactMethod !== undefined) row.preferred_contact_method = patch.preferredContactMethod;
  if (patch.accountStatus !== undefined) {
    row.account_status = patch.accountStatus;
    row.deactivated_at = patch.accountStatus === "deactivated" ? new Date().toISOString() : null;
  }
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("customers").update(row).eq("id", customerId);
  if (error) throw new Error(`updateBuyerAccountDetails failed: ${error.message}`);
}

export async function getNotificationPreferences(customerId: string): Promise<BuyerNotificationPreferences> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_notification_preferences")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throw new Error(`getNotificationPreferences failed: ${error.message}`);
  if (!data) return defaultNotificationPreferences(customerId);

  return {
    customerId,
    emailEnabled: Boolean(data.email_enabled),
    smsEnabled: Boolean(data.sms_enabled),
    inAppEnabled: Boolean(data.in_app_enabled),
    serviceUpdates: Boolean(data.service_updates),
    maintenanceReminders: Boolean(data.maintenance_reminders),
    marketing: Boolean(data.marketing),
  };
}

export async function upsertNotificationPreferences(
  customerId: string,
  patch: Partial<Omit<BuyerNotificationPreferences, "customerId">>,
): Promise<BuyerNotificationPreferences> {
  const current = await getNotificationPreferences(customerId);
  const next = { ...current, ...patch, customerId };
  const supabase = createAdminClient();

  const { error } = await supabase.from("buyer_notification_preferences").upsert({
    customer_id: customerId,
    email_enabled: next.emailEnabled,
    sms_enabled: next.smsEnabled,
    in_app_enabled: next.inAppEnabled,
    service_updates: next.serviceUpdates,
    maintenance_reminders: next.maintenanceReminders,
    marketing: next.marketing,
  });

  if (error) throw new Error(`upsertNotificationPreferences failed: ${error.message}`);
  return next;
}

function rowToNotification(row: Record<string, unknown>): BuyerNotification {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    notificationType: row.notification_type as BuyerNotification["notificationType"],
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    readAt: row.read_at ? new Date(String(row.read_at)) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: new Date(String(row.created_at)),
  };
}

export async function listBuyerNotifications(customerId: string, limit = 50): Promise<BuyerNotification[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_notifications")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`listBuyerNotifications failed: ${error.message}`);
  return (data ?? []).map((row) => rowToNotification(row as Record<string, unknown>));
}

export async function markNotificationRead(notificationId: string, customerId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("customer_id", customerId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`markNotificationRead failed: ${error.message}`);
  return Boolean(data);
}

export async function markAllNotificationsRead(customerId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("buyer_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("customer_id", customerId)
    .is("read_at", null);

  if (error) throw new Error(`markAllNotificationsRead failed: ${error.message}`);
}

async function insertNotificationIfMissing(
  customerId: string,
  dedupeKey: string,
  payload: Omit<BuyerNotification, "id" | "customerId" | "readAt" | "createdAt">,
): Promise<void> {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("buyer_notifications")
    .select("id")
    .eq("customer_id", customerId)
    .contains("metadata", { dedupeKey })
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from("buyer_notifications").insert({
    id: newId(),
    customer_id: customerId,
    notification_type: payload.notificationType,
    title: payload.title,
    body: payload.body,
    metadata: { ...payload.metadata, dedupeKey },
  });

  if (error) throw new Error(`insertNotification failed: ${error.message}`);
}

export async function syncBuyerNotifications(customerId: string): Promise<void> {
  const [vehicles, documents, requests, prefs] = await Promise.all([
    buyerVehiclesRepo.listBuyerVehicles(customerId),
    listBuyerVehicleDocuments(customerId),
    buyerServicesRepo.listBuyerServiceRequests(customerId),
    getNotificationPreferences(customerId),
  ]);

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  if (prefs.maintenanceReminders) {
    for (const vehicle of vehicles) {
      if (!vehicle.nextServiceDate) continue;
      const due = vehicle.nextServiceDate.getTime();
      const label = vehicle.nickname?.trim() || `${vehicle.make} ${vehicle.model}`;
      if (due < now) {
        await insertNotificationIfMissing(customerId, `maint-overdue-${vehicle.id}`, {
          notificationType: "maintenance_reminder",
          title: "Service overdue",
          body: `${label} is past its scheduled service date.`,
          metadata: { vehicleId: vehicle.id },
        });
      } else if (due - now <= thirtyDays) {
        await insertNotificationIfMissing(customerId, `maint-upcoming-${vehicle.id}`, {
          notificationType: "maintenance_reminder",
          title: "Upcoming service",
          body: `${label} has service due on ${vehicle.nextServiceDate.toLocaleDateString()}.`,
          metadata: { vehicleId: vehicle.id },
        });
      }
    }
  }

  if (prefs.serviceUpdates) {
    for (const doc of documents) {
      if (!doc.expiresAt) continue;
      const exp = doc.expiresAt.getTime();
      const status = exp < now ? "expired" : "upcoming";
      if (status === "expired" || exp - now <= thirtyDays) {
        await insertNotificationIfMissing(customerId, `doc-${status}-${doc.id}`, {
          notificationType: "document_expiry",
          title: status === "expired" ? "Document expired" : "Document expiring soon",
          body: `${doc.name} ${status === "expired" ? "has expired" : "expires soon"}.`,
          metadata: { documentId: doc.id, vehicleId: doc.vehicleId },
        });
      }
    }

    for (const req of requests) {
      if (req.status === "completed" || req.status === "cancelled") continue;
      await insertNotificationIfMissing(customerId, `svc-status-${req.id}-${req.status}`, {
        notificationType: "service_update",
        title: "Service request update",
        body: `Your ${req.service} request is now ${req.status.replace("_", " ")}.`,
        metadata: { requestId: req.id, status: req.status },
      });
    }
  }
}

export async function getAppPreferences(customerId: string): Promise<BuyerAppPreferences> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_preferences")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) throw new Error(`getAppPreferences failed: ${error.message}`);
  if (!data) return defaultAppPreferences(customerId);

  return {
    customerId,
    preferredProviderIds: Array.isArray(data.preferred_provider_ids) ? data.preferred_provider_ids.map(String) : [],
    serviceMode: data.service_mode as BuyerAppPreferences["serviceMode"],
    language: String(data.language ?? "en"),
    region: String(data.region ?? "UG"),
    distanceUnit: data.distance_unit as BuyerAppPreferences["distanceUnit"],
    currency: String(data.currency ?? "UGX"),
    theme: data.theme as BuyerAppPreferences["theme"],
  };
}

export async function upsertAppPreferences(
  customerId: string,
  patch: Partial<Omit<BuyerAppPreferences, "customerId">>,
): Promise<BuyerAppPreferences> {
  const current = await getAppPreferences(customerId);
  const next = { ...current, ...patch, customerId };
  const supabase = createAdminClient();

  const { error } = await supabase.from("buyer_preferences").upsert({
    customer_id: customerId,
    preferred_provider_ids: next.preferredProviderIds,
    service_mode: next.serviceMode,
    language: next.language,
    region: next.region,
    distance_unit: next.distanceUnit,
    currency: next.currency,
    theme: next.theme,
  });

  if (error) throw new Error(`upsertAppPreferences failed: ${error.message}`);
  return next;
}

function rowToDocument(row: Record<string, unknown>): BuyerVehicleDocument {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    vehicleId: String(row.vehicle_id),
    documentType: row.document_type as DocumentType,
    name: String(row.name ?? ""),
    fileUrl: row.file_url ? String(row.file_url) : null,
    storagePath: row.storage_path ? String(row.storage_path) : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)) : null,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function listBuyerVehicleDocuments(customerId: string): Promise<BuyerVehicleDocument[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("buyer_vehicle_documents")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listBuyerVehicleDocuments failed: ${error.message}`);
  return (data ?? []).map((row) => rowToDocument(row as Record<string, unknown>));
}

export type BuyerVehicleDocumentInsert = {
  customerId: string;
  vehicleId: string;
  documentType: DocumentType;
  name: string;
  fileUrl?: string | null;
  storagePath?: string | null;
  expiresAt?: Date | null;
};

export async function insertBuyerVehicleDocument(payload: BuyerVehicleDocumentInsert): Promise<BuyerVehicleDocument> {
  const supabase = createAdminClient();
  const id = newId();
  const row = {
    id,
    customer_id: payload.customerId,
    vehicle_id: payload.vehicleId,
    document_type: payload.documentType,
    name: payload.name.trim(),
    file_url: payload.fileUrl ?? null,
    storage_path: payload.storagePath ?? null,
    expires_at: payload.expiresAt?.toISOString() ?? null,
  };

  const { data, error } = await supabase.from("buyer_vehicle_documents").insert(row).select("*").single();
  if (error) throw new Error(`insertBuyerVehicleDocument failed: ${error.message}`);
  return rowToDocument(data as Record<string, unknown>);
}

export async function deleteBuyerVehicleDocument(id: string, customerId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from("buyer_vehicle_documents")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("customer_id", customerId);

  if (error) throw new Error(`deleteBuyerVehicleDocument failed: ${error.message}`);
  return Boolean(count);
}

function rowToRecommendation(row: Record<string, unknown>): ServiceProviderRecommendation {
  return {
    id: String(row.id),
    customerId: String(row.customer_id),
    vehicleId: row.vehicle_id ? String(row.vehicle_id) : null,
    providerId: row.provider_id ? String(row.provider_id) : null,
    requestId: row.request_id ? String(row.request_id) : null,
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    status: row.status as RecommendationStatus,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function listServiceRecommendations(customerId: string): Promise<ServiceProviderRecommendation[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_provider_recommendations")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listServiceRecommendations failed: ${error.message}`);
  return (data ?? []).map((row) => rowToRecommendation(row as Record<string, unknown>));
}

export async function updateRecommendationStatus(
  id: string,
  customerId: string,
  status: RecommendationStatus,
): Promise<ServiceProviderRecommendation | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_provider_recommendations")
    .update({ status })
    .eq("id", id)
    .eq("customer_id", customerId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(`updateRecommendationStatus failed: ${error.message}`);
  if (!data) return null;
  return rowToRecommendation(data as Record<string, unknown>);
}

export async function listBuyerPayments(customerId: string): Promise<BuyerPaymentRecord[]> {
  const supabase = createAdminClient();
  const [serviceRes, productRes] = await Promise.all([
    supabase
      .from("service_payments")
      .select("id, request_id, amount, currency, status, payment_method, paid_at, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("product_orders")
      .select("id, total_amount, currency, status, payment_provider, paid_at, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (serviceRes.error) throw new Error(`listBuyerPayments service failed: ${serviceRes.error.message}`);
  if (productRes.error) throw new Error(`listBuyerPayments product failed: ${productRes.error.message}`);

  const service: BuyerPaymentRecord[] = (serviceRes.data ?? []).map((row) => ({
    id: String(row.id),
    source: "service" as const,
    referenceId: String(row.request_id),
    label: "Service payment",
    amount: Number(row.amount) || 0,
    currency: String(row.currency ?? "UGX"),
    status: String(row.status),
    paymentMethod: row.payment_method ? String(row.payment_method) : null,
    paidAt: row.paid_at ? new Date(String(row.paid_at)) : null,
    createdAt: new Date(String(row.created_at)),
  }));

  const product: BuyerPaymentRecord[] = (productRes.data ?? []).map((row) => ({
    id: String(row.id),
    source: "product" as const,
    referenceId: String(row.id),
    label: "Product order",
    amount: Number(row.total_amount) || 0,
    currency: String(row.currency ?? "UGX"),
    status: String(row.status),
    paymentMethod: row.payment_provider ? String(row.payment_provider) : null,
    paidAt: row.paid_at ? new Date(String(row.paid_at)) : null,
    createdAt: new Date(String(row.created_at)),
  }));

  return [...service, ...product].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function listServiceRequestMessages(
  requestId: string,
  customerId: string,
): Promise<ServiceRequestMessage[]> {
  const request = await buyerServicesRepo.getBuyerServiceRequestByIdForCustomer(requestId, customerId);
  if (!request) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("service_request_messages")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`listServiceRequestMessages failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: String(row.id),
    requestId: String(row.request_id),
    senderType: row.sender_type as ServiceRequestMessage["senderType"],
    senderId: row.sender_id ? String(row.sender_id) : null,
    message: String(row.message),
    createdAt: new Date(String(row.created_at)),
  }));
}

export async function insertServiceRequestMessage(
  requestId: string,
  customerId: string,
  message: string,
): Promise<ServiceRequestMessage | null> {
  const request = await buyerServicesRepo.getBuyerServiceRequestByIdForCustomer(requestId, customerId);
  if (!request) return null;

  const supabase = createAdminClient();
  const id = newId();
  const { data, error } = await supabase
    .from("service_request_messages")
    .insert({
      id,
      request_id: requestId,
      sender_type: "buyer",
      sender_id: customerId,
      message: message.trim(),
    })
    .select("*")
    .single();

  if (error) throw new Error(`insertServiceRequestMessage failed: ${error.message}`);

  return {
    id: String(data.id),
    requestId: String(data.request_id),
    senderType: "buyer",
    senderId: customerId,
    message: String(data.message),
    createdAt: new Date(String(data.created_at)),
  };
}

function healthFromStatus(status: string, overdue: boolean): VehicleAnalytics["healthStatus"] {
  if (overdue || status === "awaiting_parts") return "critical";
  if (status === "in_service") return "attention";
  if (status === "ready_for_pickup") return "good";
  return "excellent";
}

type VehicleAnalytics = BuyerAnalyticsSummary["vehicles"][number];

export async function getBuyerAnalytics(customerId: string): Promise<BuyerAnalyticsSummary> {
  const vehicles = await buyerVehiclesRepo.listBuyerVehicles(customerId);
  const payments = await listBuyerPayments(customerId);
  const now = Date.now();

  const vehicleAnalytics: VehicleAnalytics[] = [];

  const monthlyMap = new Map<string, number>();

  for (const payment of payments) {
    if (payment.source !== "service" || payment.status !== "captured") continue;
    const month = payment.createdAt.toISOString().slice(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + payment.amount);
  }

  for (const vehicle of vehicles) {
    const history = await vehicleServiceHistoryRepo.listVehicleServiceHistory(vehicle.id);
    const servicePayments = payments.filter((p) => p.source === "service");
    const totalMaintenanceCost = servicePayments.reduce((sum, p) => sum + p.amount, 0) / Math.max(vehicles.length, 1);

    const overdue = Boolean(vehicle.nextServiceDate && vehicle.nextServiceDate.getTime() < now);
    const commonIssues = history
      .map((h) => h.serviceType || h.serviceName)
      .filter(Boolean)
      .slice(0, 3);

    vehicleAnalytics.push({
      vehicleId: vehicle.id,
      vehicleLabel: vehicle.nickname?.trim() || `${vehicle.make} ${vehicle.model}`,
      totalMaintenanceCost,
      serviceCount: history.length,
      lastServiceAt: history[0]?.createdAt ?? null,
      commonIssues,
      healthStatus: healthFromStatus(vehicle.vehicleStatus, overdue),
      nextServiceDate: vehicle.nextServiceDate,
    });
  }

  const monthlySpend = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }));

  return {
    totalMaintenanceCost: payments
      .filter((p) => p.source === "service" && p.status === "captured")
      .reduce((sum, p) => sum + p.amount, 0),
    totalServices: vehicleAnalytics.reduce((sum, v) => sum + v.serviceCount, 0),
    vehicles: vehicleAnalytics,
    monthlySpend,
  };
}

export async function getBuyerControlCenter(customerId: string) {
  await syncBuyerNotifications(customerId);

  const [
    account,
    notificationPreferences,
    notifications,
    preferences,
    documents,
    payments,
    recommendations,
    analytics,
    subscription,
    subscriptionHistory,
  ] = await Promise.all([
    getBuyerAccountDetails(customerId),
    getNotificationPreferences(customerId),
    listBuyerNotifications(customerId),
    getAppPreferences(customerId),
    listBuyerVehicleDocuments(customerId),
    listBuyerPayments(customerId),
    listServiceRecommendations(customerId),
    getBuyerAnalytics(customerId),
    buyerSubscriptionsRepo.getActiveBuyerSubscription(customerId),
    buyerSubscriptionsRepo.listBuyerSubscriptionHistory(customerId),
  ]);

  if (!account) return null;

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  const documentAlerts = documents
    .filter((doc) => doc.expiresAt)
    .map((doc) => {
      const exp = doc.expiresAt!.getTime();
      const status = exp < now ? ("expired" as const) : ("upcoming" as const);
      return { documentId: doc.id, vehicleId: doc.vehicleId, name: doc.name, expiresAt: doc.expiresAt!, status };
    })
    .filter((doc) => doc.status === "expired" || doc.expiresAt.getTime() - now <= thirtyDays);

  const pendingPaymentTotal = payments
    .filter((p) => p.status === "pending" || p.status === "authorized")
    .reduce((sum, p) => sum + p.amount, 0);

  const unreadNotificationCount = notifications.filter((n) => !n.readAt).length;

  return {
    account,
    notificationPreferences,
    notifications,
    unreadNotificationCount,
    preferences,
    documents,
    documentAlerts,
    payments,
    pendingPaymentTotal,
    recommendations,
    analytics,
    subscription,
    subscriptionHistory,
  };
}
