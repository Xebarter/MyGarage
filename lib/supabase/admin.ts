import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "@/lib/supabase/env";

export function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
