/**
 * Next.js instrumentation hook.
 * DNS IPv4 preference for Supabase lives in lib/supabase/admin.ts and server.ts
 * (avoids Edge bundling node:dns).
 */
export function register() {
  // no-op
}
