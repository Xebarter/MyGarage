"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

import type { FirebasePublicConfig } from "@/lib/firebase/env";
import { getFirebasePublicConfigFromClientBundle } from "@/lib/firebase/env";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let runtimeConfig: FirebasePublicConfig | null = null;
let initPromise: Promise<FirebaseApp> | undefined;
let analyticsPromise: Promise<Analytics | null> | undefined;

async function loadFirebaseConfig(): Promise<FirebasePublicConfig> {
  const fromBundle = getFirebasePublicConfigFromClientBundle();
  if (fromBundle) {
    return fromBundle;
  }

  const res = await fetch("/api/auth/firebase-config");
  if (!res.ok) {
    throw new Error("Could not load Firebase configuration.");
  }

  const body = (await res.json()) as { configured?: boolean; config?: FirebasePublicConfig };
  if (!body.configured || !body.config?.apiKey) {
    throw new Error(
      "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to .env and restart the dev server.",
    );
  }

  return body.config;
}

export async function ensureFirebaseInitialized(): Promise<FirebaseApp> {
  if (app) {
    return app;
  }

  if (!initPromise) {
    initPromise = (async () => {
      const config = await loadFirebaseConfig();
      runtimeConfig = config;
      app = getApps().length > 0 ? getApps()[0]! : initializeApp(config);
      return app;
    })().catch((err) => {
      initPromise = undefined;
      throw err;
    });
  }

  return initPromise;
}

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    throw new Error("Firebase is not initialized. Call ensureFirebaseInitialized() first.");
  }
  return app;
}

export async function getFirebaseAuth(): Promise<Auth> {
  const firebaseApp = await ensureFirebaseInitialized();
  if (!auth) {
    auth = getAuth(firebaseApp);
  }
  return auth;
}

/** Best-effort Analytics init in the browser only. */
export async function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  try {
    await ensureFirebaseInitialized();
  } catch {
    return null;
  }

  const config = runtimeConfig ?? getFirebasePublicConfigFromClientBundle();
  if (!config?.measurementId) {
    return Promise.resolve(null);
  }

  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) =>
      supported ? getAnalytics(getFirebaseApp()) : null,
    );
  }

  return analyticsPromise;
}
