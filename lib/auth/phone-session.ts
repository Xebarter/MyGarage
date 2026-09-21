import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

import {
  normalizeToE164,
  placeholderEmailForPhone,
} from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import {
  getCustomerByEmailExact,
  getCustomerById,
  getCustomerByPhone,
  insertCustomer,
  updateCustomerById,
} from "@/lib/supabase/customers-repo";

export type PhoneSessionTokens = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
};

function isDuplicateUserError(message: string): boolean {
  return /already|registered|exists|duplicate/i.test(message);
}

/** Prefer Supabase Auth `phone`, then `user_metadata.phone`. */
export function authUserPhone(user: Pick<User, "phone" | "user_metadata"> | null | undefined): string {
  if (!user) return "";
  const raw = String(user.phone ?? user.user_metadata?.phone ?? "").trim();
  if (!raw) return "";
  return normalizeToE164(raw) ?? raw;
}

async function ensureCustomerForPhone(userId: string, phone: string, email: string): Promise<void> {
  const existing =
    (await getCustomerById(userId)) ||
    (await getCustomerByPhone(phone)) ||
    (await getCustomerByEmailExact(email));

  if (existing) {
    const needsPhone = !(normalizeToE164(existing.phone) ?? existing.phone.trim());
    const patch: { phone?: string; email?: string } = {};
    if (needsPhone || (normalizeToE164(existing.phone) ?? existing.phone) !== phone) {
      // Always keep the verified sign-in number as the source of truth.
      patch.phone = phone;
    }
    if (!existing.email?.trim()) {
      patch.email = email;
    }
    if (Object.keys(patch).length > 0) {
      await updateCustomerById(existing.id, patch);
    }
    return;
  }

  await insertCustomer({
    id: userId,
    name: "Customer",
    email,
    phone,
    address: "",
    totalOrders: 0,
    totalSpent: 0,
  });
}

/** Find or create the Supabase Auth user bound to this E.164 number. */
async function ensurePhoneUser(phone: string, email: string): Promise<string> {
  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { phone },
  });

  let userId = created.data.user?.id;
  if (!userId || (created.error && !isDuplicateUserError(created.error.message))) {
    if (created.error && !isDuplicateUserError(created.error.message)) {
      throw new Error(created.error.message);
    }
  }

  if (!userId) {
    const existing = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    userId = existing.data.user?.id;
    if (!userId) {
      throw new Error(existing.error?.message || "Could not find this account.");
    }
  }

  // Prefer Auth.phone when Supabase Phone is enabled; always keep metadata.phone.
  const withPhone = await admin.auth.admin.updateUserById(userId, {
    phone,
    phone_confirm: true,
    user_metadata: { phone },
  });
  if (withPhone.error) {
    const metaOnly = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { phone },
    });
    if (metaOnly.error) {
      throw new Error(metaOnly.error.message);
    }
  }
  return userId;
}

/**
 * Mint a Supabase session after Firebase has already verified the phone.
 * Auth users are keyed by a stable placeholder email derived from the number.
 * The verified number is written to Auth.phone, metadata, and the customers row.
 */
export async function mintSupabaseSessionForPhone(phone: string): Promise<PhoneSessionTokens> {
  const e164 = normalizeToE164(phone);
  if (!e164) {
    throw new Error("Invalid phone number.");
  }
  const email = placeholderEmailForPhone(e164);
  const userId = await ensurePhoneUser(e164, email);

  try {
    await ensureCustomerForPhone(userId, e164, email);
  } catch (err) {
    console.error("[phone-session] customer sync", err instanceof Error ? err.message : err);
  }

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
