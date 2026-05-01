/**
 * Next.js may load this module during dev/build. DNS IPv4 preference for Supabase is set in
 * `lib/supabase/admin.ts` and `lib/supabase/server.ts` instead (avoids Edge bundling `node:dns`).
 */
export function register() {
  /* optional hook — keep file so Turbopack can resolve the module */
}
