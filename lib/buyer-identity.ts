"use client";

import { isPlaceholderDisplayName } from "@/lib/display-name";
import { formatE164Display, isPlaceholderEmail, normalizeToE164 } from "@/lib/phone";

export function persistBuyerLocalIdentity(opts: {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  if (typeof window === "undefined") return;
  const id = (opts.id ?? "").trim();
  const phone = (opts.phone ?? "").trim();
  const email = (opts.email ?? "").trim();
  const name = (opts.name ?? "").trim();

  if (id) localStorage.setItem("currentBuyerId", id);
  if (phone) {
    localStorage.setItem("currentBuyerPhone", normalizeToE164(phone) ?? phone);
  }
  if (email) {
    if (isPlaceholderEmail(email)) {
      localStorage.removeItem("currentBuyerEmail");
    } else {
      localStorage.setItem("currentBuyerEmail", email);
    }
  }
  if (name && !isPlaceholderDisplayName(name, { phone, email })) {
    localStorage.setItem("currentBuyerName", name);
  }
}

export function readStoredBuyerPhone(): string {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem("currentBuyerPhone") || "").trim();
}

export function readStoredBuyerName(): string {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem("currentBuyerName") || "").trim();
}

export function formatStoredBuyerPhone(phone: string): string {
  return formatE164Display(phone);
}
