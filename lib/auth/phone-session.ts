import { createClient } from "@supabase/supabase-js";

import { placeholderEmailForPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export type PhoneSessionTokens = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
};

function isDuplicateUserError(message: string): boolean {
  return /already|registered|exists|duplicate/i.test(message);
}

/** Find or create the Supabase Auth user bound to this E.164 number. */
async function ensurePhoneUser(phone: string, email: string): Promise<void> {
  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { phone },
  });

  if (created.data.user?.id && !created.error) {
    return;
  }

  if (created.error && !isDuplicateUserError(created.error.message)) {
    throw new Error(created.error.message);
  }

  const existing = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const userId = existing.data.user?.id;
  if (!userId) {
    throw new Error(existing.error?.message || "Could not find this account.");
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { ...(existing.data.user?.user_metadata ?? {}), phone },
  });
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Mint a Supabase session after Firebase has already verified the phone.
 * Auth users are keyed by a stable placeholder email derived from the number.
 */
export async function mintSupabaseSessionForPhone(phone: string): Promise<PhoneSessionTokens> {
  const email = placeholderEmailForPhone(phone);
  await ensurePhoneUser(phone, email);

  const admin = createAdminClient();
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const hashed = link.data.properties?.hashed_token;
  if (link.error || !hashed) {
    throw new Error(link.error?.message || "Could not start a session.");
  }

  const { url, anonKey } = getSupabasePublicEnv();
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let verified = await anon.auth.verifyOtp({
    type: "email",
    token_hash: hashed,
  });
  if (!verified.data.session?.access_token || !verified.data.session.refresh_token) {
    verified = await anon.auth.verifyOtp({
      type: "magiclink",
      token_hash: hashed,
    });
  }
  const session = verified.data.session;
  if (verified.error || !session?.access_token || !session.refresh_token) {
    throw new Error(verified.error?.message || "Could not create a session.");
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    token_type: session.token_type,
  };
}
