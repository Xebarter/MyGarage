import { setDefaultResultOrder } from "node:dns";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "@/lib/supabase/env";

try {
  setDefaultResultOrder("ipv4first");
} catch {
  /* restricted runtimes */
}

const FETCH_RETRIES = 3;
const FETCH_RETRY_BASE_MS = 250;

/** Short retries for transient TLS / connection resets from Node fetch to Supabase. */
async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < FETCH_RETRIES; attempt++) {
    try {
      return await fetch(input, init);
    } catch (e) {
      lastErr = e;
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
