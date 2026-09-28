import { setDefaultResultOrder } from "node:dns";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "@/lib/supabase/env";

try {
  setDefaultResultOrder("ipv4first");
} catch {
  /* restricted runtimes */
}

const FETCH_RETRIES = 5;
const FETCH_RETRY_BASE_MS = 400;
const FETCH_TIMEOUT_MS = 30_000;
const GATEWAY_COOLDOWN_MS = 20_000;

/** After a Cloudflare/gateway failure, skip further Supabase calls briefly so pages don't hang. */
let gatewayDownUntil = 0;

function gatewayFailure(status: string): Error & { code: string } {
  gatewayDownUntil = Date.now() + GATEWAY_COOLDOWN_MS;
  const err = new Error(`Cloudflare ${status} from Supabase`) as Error & { code: string };
  err.code = `CF_${status}`;
  return err;
}

/** Short retries for transient TLS / connection resets from Node fetch to Supabase. */
async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (Date.now() < gatewayDownUntil) {
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
        gatewayDownUntil = Date.now() + GATEWAY_COOLDOWN_MS;
        const err = new Error("Supabase returned HTML instead of JSON") as Error & { code: string };
        err.code = "NON_JSON";
        throw err;
      }
      return res;
    } catch (e) {
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
