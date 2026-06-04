'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

import {
  AuthBrandBanner,
  AuthCardFooter,
  AuthFormHeader,
  AuthMessage,
  AuthPageBackground,
  authCardClassName,
  authFieldClassName,
  authPrimaryButtonClassName,
} from '@/components/auth-chrome';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionHint, setSessionHint] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || session) return;
      setSessionHint('Link expired or invalid. Request a new reset email.');
    }, 800);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        window.clearTimeout(timer);
        setSessionHint(null);
      }
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess('Password updated. Redirecting…');
      window.setTimeout(() => {
        router.replace('/auth');
      }, 900);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageBackground>
      <Card className={authCardClassName}>
        <div className="space-y-5 p-5 sm:p-7">
          <AuthBrandBanner />

          <AuthFormHeader title="New password" description="Enter and confirm your new password." />

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="relative">
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className={`${authFieldClassName} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
            <div className="relative">
              <input
                required
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                className={`${authFieldClassName} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              </button>
            </div>
            <button type="submit" disabled={loading} className={authPrimaryButtonClassName}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>

          {error ? <AuthMessage variant="error">{error}</AuthMessage> : null}
          {success ? <AuthMessage variant="success">{success}</AuthMessage> : null}
          {sessionHint ? <AuthMessage variant="info">{sessionHint}</AuthMessage> : null}

          <AuthCardFooter className="justify-center">
            <Link href="/auth" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </AuthCardFooter>
        </div>
      </Card>
    </AuthPageBackground>
  );
}
