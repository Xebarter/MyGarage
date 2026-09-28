function messageLooksTransient(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("enotfound") ||
    lower.includes("connect timeout") ||
    lower.includes("cloudflare") ||
    lower.includes("error 522") ||
    lower.includes("cf_522") ||
    lower.includes("html instead of json") ||
    lower.includes("gateway recently unavailable") ||
    lower.includes("gateway timeout") ||
    lower.includes("bad gateway") ||
    lower.includes("service unavailable")
  );
}

const TRANSIENT_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "CF_502",
  "CF_503",
  "CF_504",
  "CF_522",
  "CF_523",
  "CF_524",
  "NON_JSON",
]);

function codeLooksTransient(code: unknown): boolean {
  return TRANSIENT_CODES.has(String(code ?? "").toUpperCase());
}

/** True when Node/fetch could not complete the HTTP request (DNS, TLS, timeout, reset, gateway HTML). */
export function isTransientFetchError(error: unknown): boolean {
  if (error instanceof Error) {
    if (messageLooksTransient(error.message)) return true;
    if (codeLooksTransient((error as Error & { code?: unknown }).code)) return true;
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause) return isTransientFetchError(cause);
    // supabase-js often yields an empty PostgREST Error when the gateway returns HTML (e.g. CF 522).
    if (!error.message.trim()) return true;
    return false;
  }

  if (error && typeof error === "object") {
    const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
    const details = "details" in error ? String((error as { details?: unknown }).details ?? "") : "";
    if (messageLooksTransient(`${message} ${details}`)) return true;
    if (codeLooksTransient((error as { code?: unknown }).code)) return true;
    if (!message.trim()) return true;
  }

  return false;
}

export function formatFetchError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error && cause.message) {
    return `${error.message} (${cause.message})`;
  }
  if (cause && typeof cause === "object" && "code" in cause) {
    return `${error.message} (${String((cause as { code?: string }).code)})`;
  }
  return error.message;
}

/** PostgREST errors often have empty `message` with useful `code` / `details` / `hint`. */
export function formatSupabaseError(error: unknown): string {
  if (!error || typeof error !== "object") return String(error ?? "unknown error");
  const e = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
  const parts = [
    typeof e.message === "string" && e.message.trim() ? e.message.trim() : "",
    e.code != null && String(e.code).trim() ? `code=${String(e.code)}` : "",
    typeof e.details === "string" && e.details.trim() ? `details=${e.details.trim()}` : "",
    typeof e.hint === "string" && e.hint.trim() ? `hint=${e.hint.trim()}` : "",
  ].filter(Boolean);
  if (parts.length > 0) return parts.join("; ");
  try {
    const json = JSON.stringify(error);
    return json && json !== "{}" ? json : "unknown error";
  } catch {
    return "unknown error";
  }
}
