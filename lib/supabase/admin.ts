import { setDefaultResultOrder } from "node:dns";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "@/lib/supabase/env";

try {
  setDefaultResultOrder("ipv4first");
} catch {
  /* restricted runtimes */
}

const FETCH_RETRIES = 2;
const FETCH_RETRY_BASE_MS = 250;
const FETCH_TIMEOUT_MS = 6_000;
const GATEWAY_COOLDOWN_MS = 45_000;

/**
 * Shared across Next.js server chunks. A module-level flag is duplicated per bundle,
 * so the page and `/api/feed` would each wait out a dead gateway on their own.
 */
type GatewayGlobal = typeof globalThis & { __mygarageGatewayDownUntil?: number };
const gatewayGlobal = globalThis as GatewayGlobal;

function readGatewayDownUntil(): number {
  return gatewayGlobal.__mygarageGatewayDownUntil ?? 0;
}

function markGatewayDown(): void {
  gatewayGlobal.__mygarageGatewayDownUntil = Date.now() + GATEWAY_COOLDOWN_MS;
}

function gatewayFailure(status: string): Error & { code: string } {
  markGatewayDown();
  const err = new Error(`Cloudflare ${status} from Supabase`) as Error & { code: string };
  err.code = `CF_${status}`;
  return err;
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: unknown }).name ?? "") : "";
  if (name === "TimeoutError") return true;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  return code === "UND_ERR_CONNECT_TIMEOUT" || code === "ETIMEDOUT";
}

/** Short retries for transient TLS / connection resets from Node fetch to Supabase. */
async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (Date.now() < readGatewayDownUntil()) {
    const err = new Error("Supabase gateway recently unavailable") as Error & { code: string };
    err.code = "CF_522";
    throw err;
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < FETCH_RETRIES; attempt++) {
    try {
      const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
      const signal =
        init?.signal && typeof AbortSignal.any === "function"
          ? AbortSignal.any([init.signal, timeoutSignal])
          : timeoutSignal;

      const res = await fetch(input, { ...init, signal });
      const contentType = res.headers.get("content-type") ?? "";
      if (
        res.status === 502 ||
        res.status === 503 ||
        res.status === 504 ||
        res.status === 522 ||
        res.status === 523 ||
        res.status === 524
      ) {
        throw gatewayFailure(String(res.status));
      }
      if (contentType.includes("text/html") && !contentType.includes("json")) {
        markGatewayDown();
        const err = new Error("Supabase returned HTML instead of JSON") as Error & { code: string };
        err.code = "NON_JSON";
        throw err;
      }
      return res;
    } catch (e) {
      if (isTimeoutError(e)) {
        markGatewayDown();
        const err = new Error("Supabase request timed out") as Error & { code: string };
        err.code = "ETIMEDOUT";
        throw err;
      }
      lastErr = e;
      const code =
        e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code ?? "") : "";
      if (code.startsWith("CF_") || code === "NON_JSON") {
        break;
      }
      if (attempt < FETCH_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, FETCH_RETRY_BASE_MS * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

export function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: fetchWithRetry,
    },
  });
}
