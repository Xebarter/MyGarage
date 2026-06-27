function messageLooksTransient(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("enotfound") ||
    lower.includes("connect timeout")
  );
}

/** True when Node/fetch could not complete the HTTP request (DNS, TLS, timeout, reset). */
export function isTransientFetchError(error: unknown): boolean {
  if (error instanceof Error) {
    if (messageLooksTransient(error.message)) return true;
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause) return isTransientFetchError(cause);
    return false;
  }

  if (error && typeof error === "object") {
    if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
      if (messageLooksTransient((error as { message: string }).message)) return true;
    }
    if ("code" in error) {
      const code = String((error as { code?: string }).code ?? "").toUpperCase();
      if (["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"].includes(code)) {
        return true;
      }
    }
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
