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

export function isFirebaseConfigured(): boolean {
  return Boolean(trimEnv("NEXT_PUBLIC_FIREBASE_API_KEY"));
}

export function getFirebasePublicConfig(): FirebasePublicConfig | null {
  const apiKey = trimEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  if (!apiKey) return null;

  const authDomain = trimEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  const projectId = trimEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  const storageBucket = trimEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  const messagingSenderId = trimEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  const appId = trimEnv("NEXT_PUBLIC_FIREBASE_APP_ID");

  if (!authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    throw new Error(
      "Firebase is partially configured. Set NEXT_PUBLIC_FIREBASE_API_KEY and all other NEXT_PUBLIC_FIREBASE_* variables.",
    );
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
