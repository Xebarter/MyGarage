'use client';

import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
      return typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'Google will not send SMS from localhost (Network 400). Open this page as http://127.0.0.1:3000 and add 127.0.0.1 under Firebase → Authentication → Settings → Authorized domains.'
        : 'Complete the “I’m not a robot” check, then send the code again.';
    case 'auth/quota-exceeded':
      return 'SMS quota reached. Try again later.';
    case 'auth/operation-not-allowed':
      return 'Phone sign-in is not enabled yet.';
    default:
      break;
  }
  if (/invalid.?app.?credential|captcha|recaptcha/i.test(combined)) {
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
}: {
  initialPhone: string;
  openerOrigin: string;
  role: string;
  nextPath: string;
}) {
  const router = useRouter();
  const roleMeta = useMemo(() => getAuthRoleMeta(role), [role]);
  const origin = openerOrigin.trim();
  const flutterPopup = Boolean(origin && isAllowedOpenerOrigin(origin));

  const [phoneInput, setPhoneInput] = useState(initialPhone);
  const phone = useMemo(() => normalizeToE164(phoneInput) ?? '', [phoneInput]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
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
  }, [resetVerifier]);

  async function ensureVerifier() {
    const auth = await getFirebaseAuth({ waitForRecaptchaEnterprise: false });
    if (verifierRef.current) return { auth, verifier: verifierRef.current };
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'normal',
      theme: 'light',
    });
    verifierRef.current = verifier;
    await verifier.render();
    return { auth, verifier };
  }

  async function sendCode() {
    if (!phone) {
      setError('Enter a valid phone number.');
      return;
    }
    const recaptchaResponse = document.querySelector<HTMLTextAreaElement>('#g-recaptcha-response')?.value?.trim();
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
        title={sent ? 'Enter the code' : 'Sign in with phone'}
        description={
          sent
            ? `Sent to ${formatE164Display(phone)}.`
            : 'We’ll text a 6-digit code. Uganda numbers can start with 07.'
        }
      />

      {!sent ? (
        <div className="space-y-3">
          <input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="0700 123 456"
            className={authFieldClassName}
          />
          <div id="recaptcha-container" className="flex min-h-20 justify-center" />
          <button
            type="button"
            className={authPrimaryButtonClassName}
            disabled={busy}
            onClick={() => void sendCode()}
          >
            {busy ? 'Sending…' : 'Send code'}
          </button>
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
            }}
          >
            Use a different number
          </button>
        </div>
      )}
      {error ? <AuthMessage variant="error">{error}</AuthMessage> : null}
    </>
  );
}
