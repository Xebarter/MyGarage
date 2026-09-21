'use client';

import { useEffect, useRef } from 'react';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { toast } from 'sonner';

import { ensureFirebaseInitialized } from '@/lib/firebase/client';

const TOKEN_KEY = 'mygarage-admin-fcm-token';

function playAdminAlertSound() {
  try {
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    gain.connect(ctx.destination);

    const first = ctx.createOscillator();
    first.type = 'sine';
    first.frequency.setValueAtTime(880, now);
    first.connect(gain);
    first.start(now);
    first.stop(now + 0.18);

    const second = ctx.createOscillator();
    second.type = 'sine';
    second.frequency.setValueAtTime(1175, now + 0.16);
    second.connect(gain);
    second.start(now + 0.16);
    second.stop(now + 0.52);

    window.setTimeout(() => {
      void ctx.close();
    }, 800);
  } catch {
    /* autoplay policy or missing AudioContext */
  }
}

function alertFromPayload(payload: {
  notification?: { title?: string; body?: string };
  data?: Record<string, string>;
}) {
  const title = payload.notification?.title || payload.data?.title || 'MyGarage';
  const body = payload.notification?.body || payload.data?.body || 'New admin alert';
  const url = payload.data?.url || '/admin';
  return { title, body, url };
}

async function saveToken(token: string) {
  await fetch('/api/admin/push-token', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform: 'web' }),
  });
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

async function dropToken(token: string | null) {
  if (!token) return;
  await fetch('/api/admin/push-token', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => undefined);
}

/** Registers this admin browser for FCM and plays a chime when an alert arrives. */
export function AdminPushAlerts() {
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function start() {
      if (typeof window === 'undefined' || !('Notification' in window) || !window.isSecureContext) return;
      const supported = await isSupported().catch(() => false);
      if (!supported || cancelled) return;

      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission !== 'granted' || cancelled) return;

      const app = await ensureFirebaseInitialized();
      if (cancelled) return;
      const configRes = await fetch('/api/auth/firebase-config', { cache: 'no-store' });
      const configBody = (await configRes.json()) as { config?: { vapidKey?: string } };
      const vapidKey = configBody.config?.vapidKey?.trim() || process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
      if (!vapidKey) {
        console.warn('Admin alerts: add NEXT_PUBLIC_FIREBASE_VAPID_KEY from Firebase Cloud Messaging web certificates.');
        return;
      }

      const messaging = getMessaging(app);
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (!token || cancelled) return;

      tokenRef.current = token;
      await saveToken(token);

      unsubscribe = onMessage(messaging, (payload) => {
        const alert = alertFromPayload(payload);
        playAdminAlertSound();
        toast.message(alert.title, { description: alert.body });
        try {
          new Notification(alert.title, { body: alert.body, icon: '/icon0.svg' });
        } catch {
          /* already shown by FCM in some browsers */
        }
      });
    }

    void start();

    const heartbeat = window.setInterval(() => {
      const token = tokenRef.current;
      if (token) void saveToken(token);
    }, 120_000);

    return () => {
      cancelled = true;
      unsubscribe?.();
      window.clearInterval(heartbeat);
    };
  }, []);

  return null;
}

export async function unregisterAdminPushToken(): Promise<void> {
  let token: string | null = null;
  try {
    token = sessionStorage.getItem(TOKEN_KEY);
  } catch {
    token = null;
  }
  await dropToken(token);
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
