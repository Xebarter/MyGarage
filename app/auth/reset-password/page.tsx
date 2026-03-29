"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AuthBrandBanner,
  AuthPageBackground,
  authCardClassName,
  authFieldClassName,
  authPrimaryButtonClassName,
} from "@/components/auth-chrome";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionHint, setSessionHint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || session) return;
      setSessionHint(
        "This link may be expired, or it opened the wrong site. Request a new reset email and ensure Supabase Redirect URLs include your app origin (e.g. https://your-domain.com/**).",
      );
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
  }, [supabase.auth]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Password updated. Redirecting to sign in...");
      window.setTimeout(() => {
        router.replace("/auth");
      }, 900);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageBackground>
      <Card className={authCardClassName}>
        <div className="space-y-5 p-6 md:p-8">
          <AuthBrandBanner />

          <div className="space-y-1.5 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Set new password</h1>
            <p className="mx-auto max-w-sm text-pretty text-sm text-muted-foreground">
              Choose a strong password you have not used elsewhere.
            </p>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className={authFieldClassName}
            />
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              className={authFieldClassName}
            />
            <button type="submit" disabled={loading} className={authPrimaryButtonClassName}>
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>

          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</p>
          ) : null}
          {success ? (
            <p className="rounded-lg bg-primary/10 px-3 py-2.5 text-sm text-primary">{success}</p>
          ) : null}
          {sessionHint ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
              {sessionHint}
            </p>
          ) : null}

          <div className="border-t border-border/60 pt-4 text-center text-sm">
            <Link href="/auth" className="font-medium text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </Card>
    </AuthPageBackground>
  );
}
