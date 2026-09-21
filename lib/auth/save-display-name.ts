"use client";

import { createClient } from "@/lib/supabase/client";
import { persistBuyerLocalIdentity } from "@/lib/buyer-identity";
import { firstGivenName, isPlaceholderDisplayName } from "@/lib/display-name";
import { isPlaceholderEmail, normalizeToE164 } from "@/lib/phone";

type CustomerSlice = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
};

function customerFromProfile(body: unknown): CustomerSlice | null {
  if (!body || typeof body !== "object") return null;
  const row = body as { customer?: CustomerSlice } & CustomerSlice;
  const c = row.customer && typeof row.customer === "object" ? row.customer : row;
  const id = typeof c.id === "string" ? c.id.trim() : "";
  if (!id) return null;
  return {
    id,
    name: typeof c.name === "string" ? c.name : "",
    email: typeof c.email === "string" ? c.email : "",
    phone: typeof c.phone === "string" ? c.phone : "",
  };
}

export async function fetchBuyerCustomer(opts: { email?: string; phone?: string; customerId?: string }) {
  const id = (opts.customerId ?? "").trim();
  if (id) {
    const res = await fetch(`/api/buyer/profile?customerId=${encodeURIComponent(id)}`);
    if (res.ok) return customerFromProfile(await res.json());
  }
  const email = (opts.email ?? "").trim();
  if (email) {
    const res = await fetch(`/api/buyer/profile?email=${encodeURIComponent(email)}`);
    if (res.ok) return customerFromProfile(await res.json());
  }
  const phone = (opts.phone ?? "").trim();
  if (phone) {
    const res = await fetch(`/api/buyer/profile?phone=${encodeURIComponent(phone)}`);
    if (res.ok) return customerFromProfile(await res.json());
  }
  return null;
}

export function authUserPhone(user: { phone?: string | null; user_metadata?: Record<string, unknown> | null }): string {
  const meta = user.user_metadata ?? {};
  const raw = String(user.phone ?? meta.phone ?? "").trim();
  return normalizeToE164(raw) ?? raw;
}

export function authUserFullName(user: { user_metadata?: Record<string, unknown> | null }): string {
  const meta = user.user_metadata ?? {};
  const raw = String(meta.full_name ?? meta.name ?? meta.display_name ?? "").trim();
  return raw;
}

export async function buyerNeedsDisplayName(): Promise<{
  needed: boolean;
  phone: string;
  email: string;
  customerId: string;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { needed: false, phone: "", email: "", customerId: "" };

  const phone = authUserPhone(user);
  const email = user.email?.trim() ?? "";
  const storedId = typeof window !== "undefined" ? (localStorage.getItem("currentBuyerId") || "").trim() : "";
  const customer = await fetchBuyerCustomer({ customerId: storedId, email, phone });
  const name = customer?.name || authUserFullName(user);
  const needed = isPlaceholderDisplayName(name, { phone: customer?.phone || phone, email: customer?.email || email });
  return { needed, phone: customer?.phone || phone, email: customer?.email || email, customerId: customer?.id || storedId };
}

export async function saveBuyerDisplayName(rawName: string): Promise<{ name: string; phone: string }> {
  const trimmed = rawName.trim();
  if (trimmed.length < 2) throw new Error("Enter your name.");

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const given = firstGivenName(trimmed);
  const { error: metaError } = await supabase.auth.updateUser({
    data: { full_name: trimmed, name: trimmed, given_name: given },
  });
  if (metaError) throw new Error(metaError.message);

  const phone = authUserPhone(user);
  const email = user.email?.trim() || "";
  const storedId = typeof window !== "undefined" ? (localStorage.getItem("currentBuyerId") || "").trim() : "";
  let customer = await fetchBuyerCustomer({ customerId: storedId, email, phone });

  if (customer?.id) {
    const put = await fetch(`/api/buyer/profile/${encodeURIComponent(customer.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: trimmed,
        email: customer.email || email,
        phone: customer.phone || phone,
      }),
    });
    if (!put.ok) throw new Error("Could not save your name.");
  } else {
    const post = await fetch("/api/buyer/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        name: trimmed,
        email: email || undefined,
        phone,
        address: "",
      }),
    });
    if (!post.ok) throw new Error("Could not create your profile.");
    customer = customerFromProfile(await post.json());
  }

  persistBuyerLocalIdentity({
    id: customer?.id || user.id,
    name: trimmed,
    email: isPlaceholderEmail(email) ? "" : email,
    phone: customer?.phone || phone,
  });

  return { name: trimmed, phone: customer?.phone || phone };
}
