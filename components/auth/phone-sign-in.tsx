'use client';

import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  AuthFormHeader,
  AuthMessage,
  authFieldClassName,
  authPrimaryButtonClassName,
  getAuthRoleMeta,
} from '@/components/auth-chrome';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { formatE164Display, normalizeToE164 } from '@/lib/phone';
import { isSafeAuthNext } from '@/lib/auth-next';
import { createClient } from '@/lib/supabase/client';

function isAllowedOpenerOrigin(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname === 'www.mygarage.ug' || hostname === 'mygarage.ug') return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

function notifyOpener(origin: string, payload: Record<string, string>) {
  const target = window.opener ?? (window.parent !== window ? window.parent : null);
  if (!target || !isAllowedOpenerOrigin(origin)) return;
  target.postMessage({ source: 'mygarage-phone-auth', ...payload }, origin);
}

function notifyNativeWebView(payload: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    const bridge = (window as unknown as {
      MyGaragePhoneAuth?: { postMessage: (message: string) => void };
    }).MyGaragePhoneAuth;
    bridge?.postMessage(JSON.stringify({ source: 'mygarage-phone-auth', ...payload }));
  } catch {
    /* WebView channel may be missing in a normal browser tab */
  }
}

function returnTokenToNativeApp(idToken: string) {
  notifyNativeWebView({ idToken });
  window.setTimeout(() => {
    try {
      window.location.replace(
        `mygarage://login-callback?phone_id_token=${encodeURIComponent(idToken)}`,
      );
    } catch {
      /* ignore */
    }
  }, 400);
}

/** Firebase Phone Auth rejects SMS from hostname "localhost" (Network 400). */
function redirectLocalhostToLoopback(skip = false): boolean {
  if (skip) return false;
  if (typeof window === 'undefined') return false;
  if (window.location.hostname !== 'localhost') return false;
  const next = new URL(window.location.href);
  next.hostname = '127.0.0.1';
  window.location.replace(next.toString());
  return true;
}

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function firebaseErrorMessage(err: unknown, fallback: string): string {
  const code =
    typeof err === 'object' && err && 'code' in err ? String((err as { code: string }).code) : '';
  const raw = err instanceof Error ? err.message : fallback;
  const combined = `${code} ${raw}`;
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Enter a valid phone number.';
    case 'auth/too-many-requests':
      return 'Too many code requests. Wait a minute, then try again.';
    case 'auth/invalid-verification-code':
    case 'auth/invalid-verification-id':
      return 'That code is incorrect. Try again.';
    case 'auth/session-expired':
    case 'auth/code-expired':
      return 'That code expired. Request a new one.';
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
    case 'auth/missing-recaptcha-token':
    case 'auth/internal-error':
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return 'Firebase blocks SMS on “localhost”. This page should open as http://127.0.0.1:3000 — add 127.0.0.1 under Firebase → Authentication → Settings → Authorized domains.';
      }
      if (isLocalDevHost()) {
        return 'Firebase rejected the reCAPTCHA (Network 400). Confirm Phone sign-in is enabled, and that 127.0.0.1 is listed under Firebase → Authentication → Settings → Authorized domains.';
      }
      return 'Complete the “I’m not a robot” check, then send the code again. If it keeps failing, confirm Phone Auth is enabled in Firebase.';
    case 'auth/quota-exceeded':
      return 'SMS quota reached. Try again later.';
    case 'auth/operation-not-allowed':
      return 'Phone sign-in is not enabled yet in Firebase Authentication.';
    default:
      break;
  }
  if (/invalid.?app.?credential|captcha|recaptcha|network request failed/i.test(combined)) {
    if (isLocalDevHost()) {
      return 'Firebase rejected the reCAPTCHA (Network 400). Use http://127.0.0.1:3000 and add 127.0.0.1 as an authorized domain in Firebase.';
    }
    return 'Complete the “I’m not a robot” check, then send the code again.';
  }
  const cleaned = raw.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\.?$/i, '').trim();
  if (!cleaned || cleaned.toLowerCase() === 'error') return fallback;
  return cleaned;
}

export function PhoneSignIn({
  initialPhone,
  openerOrigin,
  role,
  nextPath,
  channel = '',
  embedded = false,
  onPhaseChange,
}: {
  initialPhone: string;
  openerOrigin: string;
  role: string;
  nextPath: string;
  /** `webview` = Flutter in-app browser; return the Firebase ID token to the app. */
  channel?: string;
  /** When true, parent owns surrounding chrome; still shows step titles. */
  embedded?: boolean;
  onPhaseChange?: (phase: 'phone' | 'code' | 'done') => void;
}) {
  const router = useRouter();
  const roleMeta = useMemo(() => getAuthRoleMeta(role), [role]);
  const origin = openerOrigin.trim();
  const flutterPopup = Boolean(origin && isAllowedOpenerOrigin(origin));
  const nativeWebView = channel.trim().toLowerCase() === 'webview';
  const reactId = useId().replace(/:/g, '');
  const recaptchaContainerId = `recaptcha-container-${reactId}`;

  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const phone = useMemo(() => normalizeToE164(phoneInput) ?? '', [phoneInput]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [redirectingHost, setRedirectingHost] = useState(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  const resetVerifier = useCallback(() => {
    try {
      verifierRef.current?.clear();
    } catch {
      /* recaptcha node may already be gone */
    }
    verifierRef.current = null;
  }, []);

  useEffect(() => {
    if (redirectLocalhostToLoopback(nativeWebView)) {
      setRedirectingHost(true);
    }
  }, [nativeWebView]);

  const ensureVerifier = useCallback(async () => {
    const auth = await getFirebaseAuth({ waitForRecaptchaEnterprise: false });
    if (verifierRef.current) return { auth, verifier: verifierRef.current };
    const el = document.getElementById(recaptchaContainerId);
    if (!el) {
      throw new Error('reCAPTCHA is not ready yet. Wait a second and try again.');
    }
    el.innerHTML = '';
    const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
      size: 'normal',
      theme: 'light',
    });
    verifierRef.current = verifier;
    await verifier.render();
    return { auth, verifier };
  }, [recaptchaContainerId]);

  useEffect(() => {
    if (redirectingHost) return;
    let cancelled = false;
    void (async () => {
      try {
        await ensureVerifier();
      } catch {
        if (cancelled) return;
      }
    })();
    return () => {
      cancelled = true;
      resetVerifier();
    };
  }, [ensureVerifier, resetVerifier, redirectingHost]);

  useEffect(() => {
    if (!onPhaseChange) return;
    if (done) onPhaseChange('done');
    else if (sent) onPhaseChange('code');
    else onPhaseChange('phone');
  }, [done, sent, onPhaseChange]);

  async function sendCode() {
    if (redirectLocalhostToLoopback(nativeWebView)) {
      setRedirectingHost(true);
      return;
    }
    if (!phone) {
      setError('Enter a valid phone number.');
      return;
    }
    const recaptchaResponse = document
      .querySelector<HTMLTextAreaElement>(`#${recaptchaContainerId} #g-recaptcha-response`)
      ?.value?.trim();
    if (!recaptchaResponse) {
      setError('Tick “I’m not a robot”, then send the code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { auth, verifier } = await ensureVerifier();
      confirmationRef.current = await signInWithPhoneNumber(auth, phone, verifier);
      setSent(true);
    } catch (err) {
      resetVerifier();
      setError(firebaseErrorMessage(err, 'Could not send a sign-in code.'));
      window.setTimeout(() => {
        void ensureVerifier().catch(() => undefined);
      }, 200);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    const sms = code.replace(/\D/g, '');
    if (sms.length < 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    const confirmation = confirmationRef.current;
    if (!confirmation) {
      setError('Request a new code.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const cred = await confirmation.confirm(sms);
      const idToken = await cred.user.getIdToken();
      if (nativeWebView) {
        returnTokenToNativeApp(idToken);
        setDone(true);
        return;
      }
      if (flutterPopup) {
        notifyOpener(origin, { idToken });
        setDone(true);
        window.setTimeout(() => {
          try {
            window.close();
          } catch {
            /* ignore */
          }
        }, 500);
        return;
      }

      // Bridge: Firebase verified the phone → mint a Supabase session for the app.
      const res = await fetch('/api/auth/phone/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        access_token?: string;
        refresh_token?: string;
      } | null;
      if (!res.ok || !body?.access_token || !body.refresh_token) {
        throw new Error(body?.error || 'Could not complete phone sign-in.');
      }
      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      });
      if (sessionError) throw sessionError;

      const params = new URLSearchParams();
      if (role) params.set('role', role);
      if (isSafeAuthNext(nextPath)) params.set('next', nextPath);
      router.replace(`/auth?${params.toString()}`);
    } catch (err) {
      setError(firebaseErrorMessage(err, 'That code is incorrect.'));
    } finally {
      setBusy(false);
    }
  }

  if (redirectingHost) {
    return (
      <AuthMessage variant="info">
        Opening phone sign-in on 127.0.0.1 so Firebase can send SMS…
      </AuthMessage>
    );
  }

  if (done) {
    return (
      <>
        <AuthFormHeader badge={roleMeta.badge} title="Signed in" description="Return to the app." />
        <AuthMessage variant="success">You can close this window.</AuthMessage>
      </>
    );
  }

  return (
    <>
      <AuthFormHeader
        badge={roleMeta.badge}
        title={sent ? 'Enter the code' : embedded ? 'Welcome back' : 'Sign in with phone'}
        description={
          sent
            ? `Sent to ${formatE164Display(phone)}.`
            : embedded
              ? 'Sign in with your phone number. We’ll text a 6-digit code.'
              : 'We’ll text a 6-digit code. Uganda numbers can start with 07.'
        }
      />

      {!sent ? (
        <div className="space-y-3">
          <label className="sr-only" htmlFor="phone-sign-in-input">
            Phone number
          </label>
          <input
            id="phone-sign-in-input"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            autoFocus={embedded}
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void sendCode();
            }}
            placeholder="0700 123 456"
            className={authFieldClassName}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void verifyCode();
            }}
            className={`${authFieldClassName} text-center text-2xl font-semibold tracking-[0.4em]`}
            placeholder="000000"
          />
          <button
            type="button"
            className={authPrimaryButtonClassName}
            disabled={busy}
            onClick={() => void verifyCode()}
          >
            {busy ? 'Verifying…' : 'Verify and continue'}
          </button>
          <button
            type="button"
            className="w-full text-sm font-semibold text-muted-foreground"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setCode('');
              confirmationRef.current = null;
              resetVerifier();
              window.setTimeout(() => {
                void ensureVerifier().catch(() => undefined);
              }, 200);
            }}
          >
            Use a different number
          </button>
        </div>
      )}

      {/* Always mounted — Firebase Phone Auth needs a stable reCAPTCHA host node. */}
      <div
        id={recaptchaContainerId}
        className={sent ? 'hidden' : 'mt-3 flex min-h-20 justify-center'}
        aria-hidden={sent}
      />

      {!sent ? (
        <button
          type="button"
          className={`${authPrimaryButtonClassName} mt-3`}
          disabled={busy}
          onClick={() => void sendCode()}
        >
          {busy ? 'Sending…' : 'Continue with phone'}
        </button>
      ) : null}

      {error ? <AuthMessage variant="error">{error}</AuthMessage> : null}
    </>
  );
}
