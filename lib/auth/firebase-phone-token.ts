import { readFirebaseConfigFromProcessEnv } from "@/lib/firebase/env";
import { normalizeToE164 } from "@/lib/phone";

type LookupResponse = {
  users?: Array<{
    phoneNumber?: string;
    email?: string;
    localId?: string;
  }>;
  error?: { message?: string };
};

/** Verify a Firebase ID token and return the confirmed E.164 phone number. */
export async function phoneFromFirebaseIdToken(idToken: string): Promise<string> {
  const config = readFirebaseConfigFromProcessEnv();
  const apiKey = config?.apiKey;
  if (!apiKey) {
    throw new Error("Firebase is not configured on the server.");
  }

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const json = (await res.json()) as LookupResponse;
  if (!res.ok) {
    throw new Error(json.error?.message || "Phone verification expired. Request a new code.");
  }

  const phone = normalizeToE164(json.users?.[0]?.phoneNumber ?? "");
  if (!phone) {
    throw new Error("That sign-in did not include a verified phone number.");
  }
  return phone;
}
