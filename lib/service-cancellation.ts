export type ServiceCancelStage = "searching" | "en_route";

export type BuyerServiceCancelReason = {
  id: string;
  label: string;
  detail: string;
  stages: readonly ServiceCancelStage[];
};

/** Canonical buyer-facing cancel reasons. Persist `id` (and optional other note). */
export const BUYER_SERVICE_CANCEL_REASONS: readonly BuyerServiceCancelReason[] = [
  {
    id: "waited_too_long",
    label: "Waited too long",
    detail: "The search or arrival is taking longer than I can wait.",
    stages: ["searching", "en_route"],
  },
  {
    id: "found_help_elsewhere",
    label: "Found help elsewhere",
    detail: "Someone else is already taking care of this.",
    stages: ["searching", "en_route"],
  },
  {
    id: "issue_resolved",
    label: "Issue resolved itself",
    detail: "I no longer need this service.",
    stages: ["searching", "en_route"],
  },
  {
    id: "wrong_service",
    label: "Wrong service selected",
    detail: "I booked the wrong type of help.",
    stages: ["searching", "en_route"],
  },
  {
    id: "wrong_location",
    label: "Location is incorrect",
    detail: "The pin or address is not where I am.",
    stages: ["searching", "en_route"],
  },
  {
    id: "provider_too_slow",
    label: "Provider is taking too long",
    detail: "They accepted, but they will not arrive soon enough.",
    stages: ["en_route"],
  },
  {
    id: "provider_not_coming",
    label: "Provider does not seem to be coming",
    detail: "They are not moving toward me.",
    stages: ["en_route"],
  },
  {
    id: "unsafe",
    label: "I no longer feel safe",
    detail: "I want to cancel for safety or comfort.",
    stages: ["en_route"],
  },
  {
    id: "need_to_leave",
    label: "I have to leave",
    detail: "I cannot stay at this location.",
    stages: ["searching", "en_route"],
  },
  {
    id: "price_concern",
    label: "Price or payment concern",
    detail: "I am not comfortable with the cost.",
    stages: ["searching", "en_route"],
  },
  {
    id: "booked_by_mistake",
    label: "Booked by mistake",
    detail: "This request was accidental.",
    stages: ["searching", "en_route"],
  },
  {
    id: "other",
    label: "Something else",
    detail: "None of these fit — add a short note.",
    stages: ["searching", "en_route"],
  },
] as const;

export const BUYER_SERVICE_CANCEL_REASON_IDS = new Set(BUYER_SERVICE_CANCEL_REASONS.map((r) => r.id));

export const OTHER_CANCEL_REASON_ID = "other";
export const UNSPECIFIED_CANCEL_REASON_ID = "unspecified";
export const MAX_CANCEL_NOTE_LENGTH = 180;

export function cancelReasonsForStage(stage: ServiceCancelStage): BuyerServiceCancelReason[] {
  return BUYER_SERVICE_CANCEL_REASONS.filter((r) => r.stages.includes(stage));
}

export function cancelReasonLabel(id: string): string {
  const match = BUYER_SERVICE_CANCEL_REASONS.find((r) => r.id === id);
  if (match) return match.label;
  if (id === UNSPECIFIED_CANCEL_REASON_ID) return "No reason given";
  return "Something else";
}

export function cancelStageFromRequest(status: string, acceptedAt: string | Date | null | undefined): ServiceCancelStage {
  const s = status.toLowerCase();
  if (s === "matched" || s === "in_progress" || acceptedAt) return "en_route";
  return "searching";
}

export function canBuyerCancelBeforeArrival(
  status: string,
  arrivedAt: string | Date | null | undefined,
  startedAt?: string | Date | null,
): boolean {
  const s = status.toLowerCase();
  if (s === "completed" || s === "cancelled" || s === "canceled" || s === "expired") return false;
  if (s === "in_progress" || startedAt) return false;
  if (arrivedAt) return false;
  return s === "pending" || s === "matched";
}

export function encodeCancellationReason(reasonId: string, note?: string): string {
  const id = BUYER_SERVICE_CANCEL_REASON_IDS.has(reasonId) ? reasonId : OTHER_CANCEL_REASON_ID;
  if (id !== OTHER_CANCEL_REASON_ID) return id;
  const trimmed = (note ?? "").trim().slice(0, MAX_CANCEL_NOTE_LENGTH);
  return trimmed ? `${OTHER_CANCEL_REASON_ID}:${trimmed}` : OTHER_CANCEL_REASON_ID;
}

export function parseCancellationReason(raw: string | null | undefined): {
  id: string;
  label: string;
  note: string;
} {
  const value = (raw ?? "").trim();
  if (!value) {
    return { id: UNSPECIFIED_CANCEL_REASON_ID, label: cancelReasonLabel(UNSPECIFIED_CANCEL_REASON_ID), note: "" };
  }
  if (value.startsWith(`${OTHER_CANCEL_REASON_ID}:`)) {
    const note = value.slice(OTHER_CANCEL_REASON_ID.length + 1).trim();
    return { id: OTHER_CANCEL_REASON_ID, label: cancelReasonLabel(OTHER_CANCEL_REASON_ID), note };
  }
  if (BUYER_SERVICE_CANCEL_REASON_IDS.has(value)) {
    return { id: value, label: cancelReasonLabel(value), note: "" };
  }
  return { id: OTHER_CANCEL_REASON_ID, label: cancelReasonLabel(OTHER_CANCEL_REASON_ID), note: value.slice(0, MAX_CANCEL_NOTE_LENGTH) };
}
