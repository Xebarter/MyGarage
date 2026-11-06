type InjectedPublicEnv = { url?: string; anonKey?: string };

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Set by /api/public-config before the app bundle runs. */
function readInjectedPublicEnv(): InjectedPublicEnv | undefined {
  const value = (globalThis as { __MG_PUBLIC_ENV?: InjectedPublicEnv }).__MG_PUBLIC_ENV;
  if (!value?.url?.trim() || !value?.anonKey?.trim()) return undefined;
  return { url: value.url.trim(), anonKey: value.anonKey.trim() };
}

/**
 * Direct member access so Next can inline build-time values into the browser bundle.
 * Dynamic process.env[name] is still checked afterwards for Worker runtime bindings.
 */
function readPublicValue(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY"): string | undefined {
  const injected = readInjectedPublicEnv();
  if (name === "NEXT_PUBLIC_SUPABASE_URL" && injected?.url) return injected.url;
  if (name === "NEXT_PUBLIC_SUPABASE_ANON_KEY" && injected?.anonKey) return injected.anonKey;

  const inlined =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (typeof inlined === "string" && inlined.trim()) return inlined.trim();
  return readEnv(name);
}

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

export function hasSupabasePublicEnv(): boolean {
  return Boolean(
    readPublicValue("NEXT_PUBLIC_SUPABASE_URL") && readPublicValue("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

export function getSupabasePublicEnv() {
  const url = normalizeSupabaseUrl(
    requireEnvVar("NEXT_PUBLIC_SUPABASE_URL", readPublicValue("NEXT_PUBLIC_SUPABASE_URL")),
  );
  const anonKey = requireEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", readPublicValue("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  return { url, anonKey };
}

export function getSupabaseServiceRoleKey() {
  return requireEnvVar("SUPABASE_SERVICE_ROLE_KEY", readEnv("SUPABASE_SERVICE_ROLE_KEY"));
}
