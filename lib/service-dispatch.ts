import {
  expirePendingAssignmentsForRequest,
  expireStalePendingAssignments,
  getActiveFulfillmentRequestForVendor,
  getAssignmentById,
  getBuyerServiceRequestFullRow,
  getPendingAssignmentForVendor,
  insertPendingAssignment,
  listActiveVendorListingsForDispatch,
  listAssignmentsForRequest,
  listPendingRequestIdsNeedingOffer,
  listProviderIdsWithActiveFulfillment,
  listProviderIdsWithPendingOffer,
  listStalePendingSearchRequestIds,
  listVendorsForDispatch,
  type DispatchListingRow,
  type VendorDispatchRow,
  updateAssignmentResponse,
  updateBuyerRequestDispatchFields,
} from "@/lib/supabase/service-dispatch-repo";
import {
  ACTIVE_BUYER_SERVICE_EXISTS_CODE,
  ACTIVE_BUYER_SERVICE_EXISTS_MESSAGE,
  findOpenBuyerServiceRequest,
  updateBuyerServiceRequestProviderLocation,
} from "@/lib/supabase/buyer-services-repo";
import { parseMapPoint } from "@/lib/maps/coords";
import { listVendorIdsWithPushTokens } from "@/lib/supabase/vendor-push-tokens-repo";
import { notifyVendorOfJobOfferBestEffort } from "@/lib/push/send-job-offer";
import {
  canBuyerCancelBeforeArrival,
  encodeCancellationReason,
  BUYER_SERVICE_CANCEL_REASON_IDS,
  OTHER_CANCEL_REASON_ID,
} from "@/lib/service-cancellation";
import { cleanServiceDisplayTitle, resolveBuyerServiceCategory } from "@/lib/services-catalog";

export const DISPATCH_OFFER_TIMEOUT_SECONDS = 90;
/** After decline/expire, wait before offering the same provider again so we keep searching without spamming. */
export const DISPATCH_REOFFER_COOLDOWN_SECONDS = 45;
export const DISPATCH_ONLINE_WINDOW_MS = 120_000;
/** Whole-search timeout: if no provider accepts within this window, the request expires. */
export const DISPATCH_SEARCH_TIMEOUT_SECONDS = 150; // 2.5 minutes

export function isBuyerSearchTimedOut(createdAt: string | Date | null | undefined, now = Date.now()): boolean {
  if (createdAt == null) return false;
  const t = typeof createdAt === "string" ? Date.parse(createdAt) : createdAt.getTime();
  if (!Number.isFinite(t)) return false;
  return now - t >= DISPATCH_SEARCH_TIMEOUT_SECONDS * 1000;
}

function parseRating(v: number | string): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function onlineVendorIdsFrom(vendors: VendorDispatchRow[], now = Date.now()): Set<string> {
  const ids = new Set<string>();
  for (const vendor of vendors) {
    const seen = vendor.dispatch_seen_at ? Date.parse(vendor.dispatch_seen_at) : NaN;
    if (Number.isFinite(seen) && now - seen <= DISPATCH_ONLINE_WINDOW_MS) {
      ids.add(vendor.id);
    }
  }
  return ids;
}

function serviceNamesMatch(listingName: string, requested: string): boolean {
  const a = norm(listingName);
  const b = norm(requested);
  if (!a || !b) return false;
  if (a === b) return true;
  const cleanA = norm(cleanServiceDisplayTitle(listingName));
  const cleanB = norm(cleanServiceDisplayTitle(requested));
  if (cleanA && cleanB && (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA))) {
    return true;
  }
  return a.includes(b) || b.includes(a);
}

function listingMatchesRequest(
  listing: DispatchListingRow,
  _categoryId: string,
  _categoryTitle: string,
  service: string,
): boolean {
  return serviceNamesMatch(listing.serviceName, service);
}

export function vendorMatchesRequest(
  vendorId: string,
  category: string,
  service: string,
  listings: DispatchListingRow[],
  offerings: string[] | null | undefined,
): boolean {
  const resolved = resolveBuyerServiceCategory({ category }) ?? { id: category, title: category };
  const vendorListings = listings.filter((l) => l.vendorId === vendorId);
  if (vendorListings.length > 0) {
    return vendorListings.some((l) => listingMatchesRequest(l, resolved.id, resolved.title, service));
  }
  const offeringList = Array.isArray(offerings) ? offerings.map((x) => String(x)) : [];
  if (offeringList.length === 0) return true;
  const needle = `${resolved.title} ${resolved.id} ${service}`.toLowerCase();
  return offeringList.some((o) => {
    const offering = o.toLowerCase();
    return needle.includes(offering) || offering.includes(norm(service)) || serviceNamesMatch(o, service);
  });
}

export type RankDispatchContext = {
  listings?: DispatchListingRow[];
  onlineVendorIds?: Set<string>;
  categoryId?: string;
};

/** Rank vendor ids: online + listing match first, then offerings, then rating. */
export function rankProviderIdsForRequest(
  category: string,
  service: string,
  vendors: VendorDispatchRow[],
  context: RankDispatchContext = {},
): string[] {
  const resolved = resolveBuyerServiceCategory({ category, categoryId: context.categoryId }) ?? {
    id: context.categoryId || category,
    title: category,
  };
  const listings = context.listings ?? [];
  const online = context.onlineVendorIds ?? new Set<string>();
  const needle = `${resolved.title} ${resolved.id} ${service}`.toLowerCase();
  const tokens = needle.split(/\s+/).filter((t) => t.length >= 3);
  const listingsByVendor = new Map<string, DispatchListingRow[]>();
  for (const listing of listings) {
    const current = listingsByVendor.get(listing.vendorId) ?? [];
    current.push(listing);
    listingsByVendor.set(listing.vendorId, current);
  }

  const scored = vendors.map((v) => {
    const vendorListings = listingsByVendor.get(v.id) ?? [];
    let relevance = 0;
    if (vendorListings.some((l) => listingMatchesRequest(l, resolved.id, resolved.title, service))) {
      relevance += 20;
    }
    const offerings = Array.isArray(v.service_offerings) ? v.service_offerings.map((x) => String(x).toLowerCase()) : [];
    if (vendorListings.length === 0 && offerings.length === 0) {
      relevance += 1;
    } else {
      for (const o of offerings) {
        if (needle.includes(o) || o.includes(needle.slice(0, 12)) || serviceNamesMatch(o, service)) {
          relevance += 8;
          break;
        }
        for (const t of tokens) {
          if (t.length >= 3 && (o.includes(t) || needle.includes(o))) {
            relevance += 4;
            break;
          }
        }
      }
    }
    const rating = parseRating(v.rating);
    const onlineBoost = online.has(v.id) ? 10_000 : 0;
    return { id: v.id, score: onlineBoost + relevance * 100 + rating };
  });

  const withMatch = scored.filter((s) => s.score >= 100);
  const pool = withMatch.length > 0 ? withMatch : scored.map((s) => ({ ...s, score: s.score + 50 }));
  return [...pool].sort((a, b) => b.score - a.score).map((s) => s.id);
}

/** Mark pending searches older than DISPATCH_SEARCH_TIMEOUT_SECONDS as expired. */
export async function expireStalePendingSearches(): Promise<string[]> {
  const ids = await listStalePendingSearchRequestIds(DISPATCH_SEARCH_TIMEOUT_SECONDS);
  for (const rid of ids) {
    await expirePendingAssignmentsForRequest(rid, "search_expired");
    await updateBuyerRequestDispatchFields(rid, {
      status: "expired",
      provider_id: null,
    });
  }
  return ids;
}

async function expireSearchIfTimedOut(requestId: string, createdAt: string): Promise<boolean> {
  if (!isBuyerSearchTimedOut(createdAt)) return false;
  await expirePendingAssignmentsForRequest(requestId, "search_expired");
  await updateBuyerRequestDispatchFields(requestId, {
    status: "expired",
    provider_id: null,
  });
  return true;
}

export async function processStaleOffers(): Promise<void> {
  await expireStalePendingSearches();
  const expiredTimeout = await expireStalePendingAssignments(DISPATCH_OFFER_TIMEOUT_SECONDS);
  const unassigned = await listPendingRequestIdsNeedingOffer(DISPATCH_SEARCH_TIMEOUT_SECONDS);
  const requestIds = [...new Set([...expiredTimeout, ...unassigned])];
  for (const rid of requestIds) {
    await offerNextProviderIfNeeded(rid);
  }
}

/** Same as processStaleOffers but never throws — use on read endpoints so dispatch maintenance cannot mask primary data. */
export async function processStaleOffersBestEffort(): Promise<void> {
  try {
    await processStaleOffers();
  } catch (error) {
    console.error("processStaleOffers failed:", error);
  }
}

/**
 * Providers temporarily skipped for this request.
 * Declined/expired are soft-excluded only during cooldown so search continues
 * until a match, the buyer cancels, or the search times out (status leaves pending).
 */
async function getExcludedProviderIds(
  requestId: string,
  now = Date.now(),
  searchStartedAt?: string | null,
): Promise<Set<string>> {
  const assignments = await listAssignmentsForRequest(requestId);
  const excluded = new Set<string>();
  const latestTerminal = new Map<string, number>();
  const searchStart = searchStartedAt ? Date.parse(searchStartedAt) : NaN;

  for (const a of assignments) {
    const assignedAt = Date.parse(a.assigned_at);
    if (Number.isFinite(searchStart) && Number.isFinite(assignedAt) && assignedAt < searchStart - 500) {
      continue;
    }
    if (a.response === "pending") continue;
    if (a.response === "accepted") {
      excluded.add(a.provider_id);
      continue;
    }
    const at = Date.parse(a.responded_at || a.assigned_at);
    const prev = latestTerminal.get(a.provider_id);
    if (!Number.isFinite(at)) {
      excluded.add(a.provider_id);
      continue;
    }
    if (prev == null || at > prev) {
      latestTerminal.set(a.provider_id, at);
    }
  }

  const cooldownMs = DISPATCH_REOFFER_COOLDOWN_SECONDS * 1000;
  for (const [providerId, at] of latestTerminal) {
    if (now - at < cooldownMs) {
      excluded.add(providerId);
    }
  }
  return excluded;
}

/** Prefer vendors never offered; otherwise reoffer after cooldown (keeps search alive). */
function pickNextProviderId(
  ranked: string[],
  eligible: (id: string) => boolean,
  reachable: Set<string>,
  previouslyOffered: Set<string>,
): string | undefined {
  const candidates = ranked.filter((id) => eligible(id) && reachable.has(id));
  const fresh = candidates.find((id) => !previouslyOffered.has(id));
  return fresh ?? candidates[0];
}

async function assignAndNotify(requestId: string, vendorId: string): Promise<void> {
  const assignment = await insertPendingAssignment(requestId, vendorId);
  const request = await getBuyerServiceRequestFullRow(requestId);
  await notifyVendorOfJobOfferBestEffort({
    vendorId,
    assignmentId: assignment.id,
    requestId,
    service: request?.service || "Job offer",
    location: request?.location || "",
    destinationLat: request?.destination_lat ?? null,
    destinationLng: request?.destination_lng ?? null,
  });
}

export async function offerNextProviderIfNeeded(requestId: string): Promise<void> {
  const request = await getBuyerServiceRequestFullRow(requestId);
  // Buyer cancel, search timeout, or match stops the search loop.
  if (!request || request.status !== "pending") return;
  if (await expireSearchIfTimedOut(requestId, request.created_at)) return;

  const existing = await listAssignmentsForRequest(requestId);
  const hasPending = existing.some((a) => a.response === "pending");
  if (hasPending) return;

  const previouslyOffered = new Set(existing.map((a) => a.provider_id));
  const excluded = await getExcludedProviderIds(requestId, Date.now(), request.created_at);
  const [busyProviders, pendingOfferProviders, vendors, listings, pushVendors] = await Promise.all([
    listProviderIdsWithActiveFulfillment(),
    listProviderIdsWithPendingOffer(),
    listVendorsForDispatch(),
    listActiveVendorListingsForDispatch(),
    listVendorIdsWithPushTokens(),
  ]);
  const online = onlineVendorIdsFrom(vendors);
  const reachable = new Set<string>([...online, ...pushVendors]);
  const ranked = rankProviderIdsForRequest(request.category, request.service, vendors, {
    listings,
    onlineVendorIds: reachable,
  });
  const offeringsByVendor = new Map(vendors.map((v) => [v.id, v.service_offerings]));

  const eligible = (id: string) =>
    !excluded.has(id) &&
    !busyProviders.has(id) &&
    !pendingOfferProviders.has(id) &&
    vendorMatchesRequest(id, request.category, request.service, listings, offeringsByVendor.get(id));

  const nextId = pickNextProviderId(ranked, eligible, reachable, previouslyOffered);
  if (!nextId) {
    // No reachable provider right now — leave request pending so polls keep searching.
    return;
  }

  try {
    await assignAndNotify(requestId, nextId);
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("23505")) {
      return;
    }
    throw e;
  }
}

export async function startDispatchForNewRequest(requestId: string): Promise<void> {
  await processStaleOffers();
  await offerNextProviderIfNeeded(requestId);
}

/**
 * Buyer cancels while searching, or after a match before the provider arrives.
 */
export async function cancelBuyerServiceSearch(
  requestId: string,
  customerId: string,
  options?: { reasonId?: string; note?: string },
): Promise<{ ok: boolean; error?: string }> {
  const request = await getBuyerServiceRequestFullRow(requestId);
  if (!request) return { ok: false, error: "Request not found" };
  if (request.customer_id !== customerId) {
    return { ok: false, error: "Request not found" };
  }
  if (!canBuyerCancelBeforeArrival(request.status, request.arrived_at, request.started_at)) {
    if (request.status === "cancelled" || request.status === "canceled") {
      return { ok: true };
    }
    return { ok: false, error: "This request can no longer be cancelled. The provider has already arrived." };
  }

  const reasonId = (options?.reasonId ?? "").trim();
  if (!reasonId || !BUYER_SERVICE_CANCEL_REASON_IDS.has(reasonId)) {
    return { ok: false, error: "Choose a reason for cancelling." };
  }
  const note = (options?.note ?? "").trim();
  if (reasonId === OTHER_CANCEL_REASON_ID && note.length < 3) {
    return { ok: false, error: "Please add a short note so we can improve." };
  }

  await expirePendingAssignmentsForRequest(requestId);
  const patch: Parameters<typeof updateBuyerRequestDispatchFields>[1] = {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
    cancelled_by: "buyer",
    cancellation_reason: encodeCancellationReason(reasonId, note),
  };
  if (request.status === "pending") {
    patch.provider_id = null;
  }
  await updateBuyerRequestDispatchFields(requestId, patch);
  return { ok: true };
}

/**
 * Buyer restarts an expired or cancelled search on the same request
 * (same service, location, and id — no new catalog booking).
 */
export async function restartBuyerServiceSearch(
  requestId: string,
  customerId: string,
): Promise<{ ok: boolean; error?: string; code?: string; requestId?: string }> {
  const request = await getBuyerServiceRequestFullRow(requestId);
  if (!request) return { ok: false, error: "Request not found" };
  if (request.customer_id !== customerId) {
    return { ok: false, error: "Request not found" };
  }
  const status = request.status.toLowerCase();
  if (status !== "expired" && status !== "cancelled" && status !== "canceled") {
    return { ok: false, error: "This request cannot be restarted" };
  }

  await processStaleOffersBestEffort();
  const open = await findOpenBuyerServiceRequest(customerId, requestId);
  if (open) {
    return {
      ok: false,
      error: ACTIVE_BUYER_SERVICE_EXISTS_MESSAGE,
      code: ACTIVE_BUYER_SERVICE_EXISTS_CODE,
      requestId: open.id,
    };
  }

  await expirePendingAssignmentsForRequest(requestId, "search_restarted");
  const now = new Date().toISOString();
  try {
    await updateBuyerRequestDispatchFields(requestId, {
      status: "pending",
      provider_id: null,
      accepted_at: null,
      arrived_at: null,
      started_at: null,
      completed_at: null,
      created_at: now,
    });
  } catch (error) {
    const open = await findOpenBuyerServiceRequest(customerId, requestId);
    if (open) {
      return {
        ok: false,
        error: ACTIVE_BUYER_SERVICE_EXISTS_MESSAGE,
        code: ACTIVE_BUYER_SERVICE_EXISTS_CODE,
        requestId: open.id,
      };
    }
    throw error;
  }
  try {
    await startDispatchForNewRequest(requestId);
  } catch (dispatchError) {
    console.error("restartBuyerServiceSearch dispatch failed:", dispatchError);
  }
  return { ok: true };
}

/** Assign the oldest matching pending job to a provider who is currently polling. */
export async function claimNextOfferForVendor(vendorId: string): Promise<void> {
  const id = vendorId.trim();
  if (!id) return;

  const busy = await getActiveFulfillmentRequestForVendor(id);
  if (busy) return;

  const current = await getPendingAssignmentForVendor(id);
  if (current) {
    if (!(await expireSearchIfTimedOut(current.request.id, current.request.created_at))) {
      return;
    }
  }

  const [needing, listings, vendors] = await Promise.all([
    listPendingRequestIdsNeedingOffer(DISPATCH_SEARCH_TIMEOUT_SECONDS),
    listActiveVendorListingsForDispatch(),
    listVendorsForDispatch(),
  ]);
  const vendor = vendors.find((v) => v.id === id);
  const offerings = vendor?.service_offerings ?? [];

  for (const requestId of needing) {
    const request = await getBuyerServiceRequestFullRow(requestId);
    if (!request || request.status !== "pending") continue;
    if (await expireSearchIfTimedOut(requestId, request.created_at)) continue;
    if (!vendorMatchesRequest(id, request.category, request.service, listings, offerings)) continue;
    const excluded = await getExcludedProviderIds(requestId, Date.now(), request.created_at);
    if (excluded.has(id)) continue;
    try {
      await assignAndNotify(requestId, id);
      return;
    } catch (e) {
      const msg = String((e as Error)?.message ?? e);
      if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("23505")) {
        continue;
      }
      throw e;
    }
  }
}

export async function respondToDispatchOffer(
  assignmentId: string,
  vendorId: string,
  action: "accept" | "decline",
  coords?: { lat?: unknown; lng?: unknown },
): Promise<{ ok: boolean; error?: string }> {
  await processStaleOffers();

  const assignment = await getAssignmentById(assignmentId);
  if (!assignment || assignment.provider_id !== vendorId) {
    return { ok: false, error: "Assignment not found" };
  }
  if (assignment.response !== "pending") {
    return { ok: false, error: "This offer is no longer active" };
  }

  const request = await getBuyerServiceRequestFullRow(assignment.request_id);
  if (!request) return { ok: false, error: "Request not found" };

  if (request.status !== "pending" || (await expireSearchIfTimedOut(request.id, request.created_at))) {
    await updateAssignmentResponse(assignmentId, "expired", "search_expired");
    return { ok: false, error: "This request is no longer available" };
  }

  if (action === "decline") {
    await updateAssignmentResponse(assignmentId, "declined");
    // Immediately try the next provider; if none are free, pending stays open and polls keep searching.
    await offerNextProviderIfNeeded(request.id);
    return { ok: true };
  }

  const alreadyBusy = await getActiveFulfillmentRequestForVendor(vendorId);
  if (alreadyBusy != null) {
    return {
      ok: false,
      error: "Finish your current job (or wait for the buyer to cancel) before accepting another.",
    };
  }

  await updateAssignmentResponse(assignmentId, "accepted");
  const now = new Date().toISOString();
  await updateBuyerRequestDispatchFields(request.id, {
    status: "matched",
    provider_id: vendorId,
    accepted_at: now,
  });
  const point = parseMapPoint(coords?.lat, coords?.lng);
  if (point) {
    await updateBuyerServiceRequestProviderLocation(request.id, point.lat, point.lng);
  }
  return { ok: true };
}

/** Advance fulfillment stages (buyer or provider tools). */
export async function advanceRequestStage(
  requestId: string,
  stage: "arrived" | "started" | "completed",
): Promise<void> {
  const row = await getBuyerServiceRequestFullRow(requestId);
  const now = new Date().toISOString();
  if (stage === "arrived") {
    await updateBuyerRequestDispatchFields(requestId, { arrived_at: now, status: "matched" });
    return;
  }
  if (stage === "started") {
    await updateBuyerRequestDispatchFields(requestId, {
      started_at: now,
      status: "in_progress",
      ...(row?.arrived_at ? {} : { arrived_at: now }),
    });
    return;
  }
  await updateBuyerRequestDispatchFields(requestId, {
    completed_at: now,
    status: "completed",
    ...(row?.arrived_at ? {} : { arrived_at: now }),
    ...(row?.started_at ? {} : { started_at: now }),
  });
}
