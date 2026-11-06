"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/supabase/env";

let browserClient: SupabaseClient | undefined;

/**
 * Pages such as /admin/analytics construct the browser client during render.
 * Cloudflare's `next build` prerenders those pages without runtime bindings.
 * Effects do not run during prerender, so a stub is enough to finish the export.
 */
function createPrerenderStub(): SupabaseClient {
  const call = () =>
    Promise.resolve({
      data: {
        user: null,
        session: null,
        subscription: { unsubscribe() {} },
      },
      error: null,
    });
  const proxy: unknown = new Proxy(call, {
    get(_target, prop) {
      if (prop === "then") return undefined;
      return proxy;
    },
  });
  return proxy as SupabaseClient;
}

export function createClient() {
  if (browserClient) {
    return browserClient;
  }

  if (!hasSupabasePublicEnv()) {
    if (typeof window === "undefined") {
      return createPrerenderStub();
    }
  }

  const { url, anonKey } = getSupabasePublicEnv();
  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}
