"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

import { getFirebasePublicConfig, isFirebaseConfigured } from "@/lib/firebase/env";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let analyticsPromise: Promise<Analytics | null> | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  if (!app) {
    const config = getFirebasePublicConfig();
    if (!config) {
      throw new Error("Firebase is not configured.");
    }
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(config);
  }

  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

/** Best-effort Analytics init in the browser only. */
export function initFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }

  const config = getFirebasePublicConfig();
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
