"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase/client";

export class GoogleSignInCancelledError extends Error {
  constructor() {
    super("Sign-in was cancelled.");
    this.name = "GoogleSignInCancelledError";
  }
}

export async function getGoogleIdTokenFromFirebase(): Promise<{
  idToken: string;
  accessToken?: string;
}> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const idToken = credential?.idToken;

    if (!idToken) {
      throw new Error("Google did not return an ID token. Try again.");
    }

    return {
      idToken,
      accessToken: credential?.accessToken ?? undefined,
    };
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";

    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      throw new GoogleSignInCancelledError();
    }

    throw err;
  }
}
