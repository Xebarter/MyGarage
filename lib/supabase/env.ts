const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabasePublicEnv() {
  return {
    url: requireEnvVar("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl),
    anonKey: requireEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey),
  };
}

export function getSupabaseServiceRoleKey() {
  return requireEnvVar("SUPABASE_SERVICE_ROLE_KEY", supabaseServiceRoleKey);
}
