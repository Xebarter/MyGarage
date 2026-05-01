const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/** Trim and strip trailing slashes so PostgREST base URL matches what supabase-js expects. */
function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      throw new Error("invalid protocol");
    }
    return trimmed;
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL must be a valid http(s) URL (got: ${JSON.stringify(raw.slice(0, 64))}${raw.length > 64 ? "…" : ""})`,
    );
  }
}

export function getSupabasePublicEnv() {
  const url = normalizeSupabaseUrl(requireEnvVar("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl));
  const anonKey = requireEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey).trim();
  return { url, anonKey };
}

export function getSupabaseServiceRoleKey() {
  return requireEnvVar("SUPABASE_SERVICE_ROLE_KEY", supabaseServiceRoleKey).trim();
}
