import {
  expireStalePendingAssignments,
  getAssignmentById,
  getBuyerServiceRequestFullRow,
  insertPendingAssignment,
  listAssignmentsForRequest,
  listVendorsForDispatch,
  updateAssignmentResponse,
  updateBuyerRequestDispatchFields,
} from "@/lib/supabase/service-dispatch-repo";

export const DISPATCH_OFFER_TIMEOUT_SECONDS = 90;

function parseRating(v: number | string): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/** Rank vendor ids: relevance to category/service, then rating. Empty offerings = generalist. */
export function rankProviderIdsForRequest(category: string, service: string, vendors: Awaited<ReturnType<typeof listVendorsForDispatch>>): string[] {
  const needle = `${category} ${service}`.toLowerCase();
  const tokens = needle.split(/\s+/).filter((t) => t.length >= 3);

  const scored = vendors.map((v) => {
    const offerings = Array.isArray(v.service_offerings) ? v.service_offerings.map((x) => String(x).toLowerCase()) : [];
    let relevance = 0;
    if (offerings.length === 0) {
      relevance = 1;
    } else {
      for (const o of offerings) {
        if (needle.includes(o) || o.includes(needle.slice(0, 12))) {
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
    return { id: v.id, score: relevance * 100 + rating };
  });

  const withMatch = scored.filter((s) => s.score >= 100);
  const pool = withMatch.length > 0 ? withMatch : scored.map((s) => ({ ...s, score: s.score + 50 }));
  return [...pool].sort((a, b) => b.score - a.score).map((s) => s.id);
}

export async function processStaleOffers(): Promise<void> {
  const requestIds = await expireStalePendingAssignments(DISPATCH_OFFER_TIMEOUT_SECONDS);
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

async function getExcludedProviderIds(requestId: string): Promise<Set<string>> {
  const assignments = await listAssignmentsForRequest(requestId);
  const excluded = new Set<string>();
  for (const a of assignments) {
    if (a.response === "pending") continue;
    excluded.add(a.provider_id);
  }
  return excluded;
}

export async function offerNextProviderIfNeeded(requestId: string): Promise<void> {
  const request = await getBuyerServiceRequestFullRow(requestId);
  if (!request || request.status !== "pending") return;

  const existing = await listAssignmentsForRequest(requestId);
  const hasPending = existing.some((a) => a.response === "pending");
  if (hasPending) return;

  const excluded = await getExcludedProviderIds(requestId);
  const vendors = await listVendorsForDispatch();
  const ranked = rankProviderIdsForRequest(request.category, request.service, vendors);

  const nextId = ranked.find((id) => !excluded.has(id));
  if (!nextId) {
    await updateBuyerRequestDispatchFields(requestId, { status: "cancelled" });
    return;
  }

  try {
    await insertPendingAssignment(requestId, nextId);
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

export async function respondToDispatchOffer(
  assignmentId: string,
  vendorId: string,
  action: "accept" | "decline",
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

  if (action === "decline") {
    await updateAssignmentResponse(assignmentId, "declined");
    await offerNextProviderIfNeeded(request.id);
    return { ok: true };
  }

  await updateAssignmentResponse(assignmentId, "accepted");
  const now = new Date().toISOString();
  await updateBuyerRequestDispatchFields(request.id, {
    status: "matched",
    provider_id: vendorId,
    accepted_at: now,
  });
  return { ok: true };
}

/** Advance fulfillment stages (buyer or provider tools). */
export async function advanceRequestStage(
  requestId: string,
  stage: "arrived" | "started" | "completed",
): Promise<void> {
  const now = new Date().toISOString();
  if (stage === "arrived") {
    await updateBuyerRequestDispatchFields(requestId, { arrived_at: now, status: "matched" });
  } else if (stage === "started") {
    await updateBuyerRequestDispatchFields(requestId, { started_at: now, status: "in_progress" });
  } else {
    await updateBuyerRequestDispatchFields(requestId, { completed_at: now, status: "completed" });
  }
}
