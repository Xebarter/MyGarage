import { createClient, type User } from "@supabase/supabase-js";

import {
  isPlaceholderEmail,
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
import { getVendorByPhone } from "@/lib/supabase/vendors-repo";

export type PhoneSessionTokens = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  token_type?: string;
};

type PhoneAccount = {
  userId: string;
  sessionEmail: string;
};

type PhoneProfile = {
  id: string;
  email: string;
  createdAt: Date;
};

function isDuplicateUserError(message: string): boolean {
  return /already|registered|exists|duplicate/i.test(message);
}

function hasRealEmail(email: string): boolean {
  const trimmed = email.trim();
  return Boolean(trimmed) && !isPlaceholderEmail(trimmed);
}

function preferExistingProfile(customer?: PhoneProfile | null, vendor?: PhoneProfile | null): PhoneProfile | null {
  if (customer && vendor) {
    if (customer.id === vendor.id) return customer;
    const customerReal = hasRealEmail(customer.email);
    const vendorReal = hasRealEmail(vendor.email);
    if (customerReal !== vendorReal) return customerReal ? customer : vendor;
    return customer.createdAt.getTime() <= vendor.createdAt.getTime() ? customer : vendor;
  }
  return customer ?? vendor ?? null;
}

function sessionEmailForUser(user: User, profileEmail: string, placeholderEmail: string): string {
  const authEmail = (user.email ?? "").trim();
  const fromProfile = profileEmail.trim();
  if (hasRealEmail(authEmail)) return authEmail;
  if (hasRealEmail(fromProfile)) return fromProfile;
  if (authEmail) return authEmail;
  return placeholderEmail;
}

async function attachPhoneToAuthUser(userId: string, phone: string): Promise<void> {
  const admin = createAdminClient();
  const withPhone = await admin.auth.admin.updateUserById(userId, {
    phone,
    phone_confirm: true,
    user_metadata: { phone },
  });
  if (!withPhone.error) return;
  const metaOnly = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { phone },
  });
  if (metaOnly.error) {
    throw new Error(metaOnly.error.message);
  }
}

async function accountFromProfile(profile: PhoneProfile, placeholderEmail: string): Promise<PhoneAccount | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(profile.id);
  const user = data.user;
  if (error || !user) return null;
  return {
    userId: user.id,
    sessionEmail: sessionEmailForUser(user, profile.email, placeholderEmail),
  };
}

/** Create or reuse the phone-only Auth user when no existing account owns this number. */
async function ensurePlaceholderPhoneUser(phone: string, email: string): Promise<string> {
  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { phone },
  });

  let userId = created.data.user?.id;
  if (created.error && !isDuplicateUserError(created.error.message)) {
    throw new Error(created.error.message);
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

  return userId;
}

/**
 * Prefer an existing customer/vendor that already has this number, then a
 * prior phone-only Auth user, then a new placeholder user.
 */
async function resolveAccountForPhone(phone: string): Promise<PhoneAccount> {
  const placeholderEmail = placeholderEmailForPhone(phone);

  let customer: PhoneProfile | null = null;
  let vendor: PhoneProfile | null = null;
  try {
    const row = await getCustomerByPhone(phone);
    if (row) customer = { id: row.id, email: row.email, createdAt: row.createdAt };
  } catch (err) {
    console.error("[phone-session] customer lookup", err instanceof Error ? err.message : err);
  }
  try {
    const row = await getVendorByPhone(phone);
    if (row) vendor = { id: row.id, email: row.email, createdAt: row.createdAt };
  } catch (err) {
    console.error("[phone-session] vendor lookup", err instanceof Error ? err.message : err);
  }

  const profile = preferExistingProfile(customer, vendor);
  if (profile) {
    const matched = await accountFromProfile(profile, placeholderEmail);
    if (matched) {
      await attachPhoneToAuthUser(matched.userId, phone);
      return matched;
    }
  }

  const userId = await ensurePlaceholderPhoneUser(phone, placeholderEmail);
  await attachPhoneToAuthUser(userId, phone);
  return { userId, sessionEmail: placeholderEmail };
}

async function ensureCustomerForPhone(userId: string, phone: string, email: string): Promise<void> {
  const existing =
    (await getCustomerById(userId)) ||
    (await getCustomerByPhone(phone)) ||
    (await getCustomerByEmailExact(email));

  if (existing) {
    const patch: { phone?: string; email?: string } = {};
    const existingPhone = normalizeToE164(existing.phone) ?? existing.phone.trim();
    if (existingPhone !== phone) {
      patch.phone = phone;
    }
    if (!existing.email?.trim() && email) {
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

async function mintSessionForEmail(email: string): Promise<PhoneSessionTokens> {
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

/**
 * Mint a Supabase session after Firebase has already verified the phone.
 * If that number already belongs to a customer or vendor, sign into that account.
 */
export async function mintSupabaseSessionForPhone(phone: string): Promise<PhoneSessionTokens> {
  const e164 = normalizeToE164(phone);
  if (!e164) {
    throw new Error("Invalid phone number.");
  }

  const account = await resolveAccountForPhone(e164);

  try {
    await ensureCustomerForPhone(account.userId, e164, account.sessionEmail);
  } catch (err) {
    console.error("[phone-session] customer sync", err instanceof Error ? err.message : err);
  }

  return mintSessionForEmail(account.sessionEmail);
}
