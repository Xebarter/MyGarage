export type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
};

function trimEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Read Firebase web config from server/runtime env (API routes, next.config). */
export function readFirebaseConfigFromProcessEnv(): FirebasePublicConfig | null {
  const apiKey = trimEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!apiKey) return null;

  const authDomain = trimEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  const projectId = trimEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const storageBucket = trimEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  const messagingSenderId = trimEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  const appId = trimEnv("NEXT_PUBLIC_FIREBASE_APP_ID");

  if (!authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }

  const measurementId = trimEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID");

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    ...(measurementId ? { measurementId } : {}),
  };
}

/** Client bundle may not inline env; prefer server config via `/api/auth/firebase-config`. */
export function getFirebasePublicConfigFromClientBundle(): FirebasePublicConfig | null {
  return readFirebaseConfigFromProcessEnv();
}

export function isFirebaseConfigured(): boolean {
  return Boolean(readFirebaseConfigFromProcessEnv());
}
