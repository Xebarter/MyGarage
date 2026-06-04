"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";

import { AuthGoogleButton } from "@/components/auth-google-button";
import {
  AuthBrandBanner,
  AuthCardFooter,
  AuthDivider,
  AuthFormHeader,
  AuthMessage,
  AuthPageBackground,
  authCardClassName,
  authFieldClassName,
  authPrimaryButtonClassName,
  getAuthRoleMeta,
} from "@/components/auth-chrome";
import { Card } from "@/components/ui/card";
import { initFirebaseAnalytics } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/env";
import {
  getGoogleIdTokenFromFirebase,
  GoogleSignInCancelledError,
} from "@/lib/firebase/google-sign-in";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";

type AuthMode = "signin" | "forgot";

function countPhoneDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

function getDefaultNext(role: string) {
  if (role === "vendor") return "/vendor";
  if (role === "services") return "/services/orders";
  if (role === "admin") return "/admin";
  if (role === "buyer") return "/buyer";
  return "/";
}

function AuthSkeleton() {
  return (
    <AuthPageBackground>
      <Card className={authCardClassName}>
        <div className="space-y-5 p-5 sm:p-7">
          <div className="mx-auto h-10 w-40 animate-pulse rounded-lg bg-muted/60" />
          <div className="mx-auto h-6 w-32 animate-pulse rounded bg-muted/60" />
          <div className="space-y-2.5">
            <div className="h-11 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-11 animate-pulse rounded-xl bg-muted/50" />
            <div className="h-11 animate-pulse rounded-xl bg-muted/50" />
          </div>
        </div>
      </Card>
    </AuthPageBackground>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Derived directly from the live URL — always up-to-date on client navigation
  const role = searchParams.get("role") || "buyer";
  const nextPath = searchParams.get("next") || getDefaultNext(role);
  const authError = searchParams.get("error") || null;
  const isAdminRole = role === "admin";

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [buyerFlowStep, setBuyerFlowStep] = useState<"signin" | "phone">("signin");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(() => isFirebaseConfigured());

  const roleMeta = useMemo(() => getAuthRoleMeta(role), [role]);
  const googleAuthEnabled = firebaseReady;

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/firebase-enabled")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { enabled?: boolean } | null) => {
        if (!cancelled && typeof body?.enabled === "boolean") {
          setFirebaseReady(body.enabled);
        }
      })
      .catch(() => {
        /* keep build-time fallback */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (googleAuthEnabled) {
      void initFirebaseAnalytics();
    }
  }, [googleAuthEnabled]);

  useEffect(() => {
    setPhone("");
    setBuyerFlowStep("signin");
  }, [role]);

  // Re-run whenever the target portal changes so stale conflict state is cleared
  useEffect(() => {
    let cancelled = false;

    setSessionChecked(false);
    setError(null);

    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        setSessionChecked(true);
        return;
      }

      // Admin portal remains role-gated; other portals are profile-based on the same auth user.
      if (isAdminRole) {
        const allowed = await hasAdminAccess();
        if (!allowed) {
          await supabase.auth.signOut();
          setError("Admin access denied. Contact the system owner.");
          setSessionChecked(true);
          return;
        }
      }

      if (role === "buyer" && user.email) {
        const custRes = await fetch(`/api/customers?email=${encodeURIComponent(user.email.trim())}`);
        const customer = custRes.ok ? ((await custRes.json()) as { id: string; phone?: string }) : null;
        if (customer?.id) {
          localStorage.setItem("currentBuyerId", customer.id);
          if (customer.phone) localStorage.setItem("currentBuyerPhone", customer.phone);
        }
        const okPhone = Boolean(customer && countPhoneDigits(customer.phone ?? "") >= 9);
        if (!okPhone) {
          setBuyerFlowStep("phone");
          setPhone((customer?.phone ?? "").trim());
          setSessionChecked(true);
          return;
        }
      }

      await persistSessionProfile();
      setSessionChecked(true);
      router.replace(nextPath);
    };

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [role, nextPath, router, supabase.auth]);

  const hasAdminAccess = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const appRole = String(user.app_metadata?.role ?? "").toLowerCase();
    const appRoles = Array.isArray(user.app_metadata?.roles)
      ? (user.app_metadata.roles as unknown[]).map((entry) => String(entry).toLowerCase())
      : [];

    return appRole === "admin" || appRoles.includes("admin");
  };

  const persistSessionProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const fallbackName = user.email?.split("@")[0] || "User";
    const normalizedRole = role === "services" ? "service provider" : role;
    const roleName = `${fallbackName} (${normalizedRole})`;

    if (role === "vendor") {
      localStorage.setItem("currentVendorId", user.id);
      localStorage.setItem("currentVendorName", roleName);
      try {
        await fetch("/api/vendor/bootstrap", { method: "POST" });
      } catch {
        // best-effort
      }
      return;
    }

    if (role === "services") {
      localStorage.setItem("currentServiceProviderName", roleName);
      localStorage.setItem("currentVendorId", user.id);
      localStorage.setItem("currentVendorName", roleName);
      try {
        await fetch("/api/vendor/bootstrap", { method: "POST" });
      } catch {
        // best-effort — ensures vendors row exists for dispatch / orders
      }
      return;
    }

    localStorage.setItem("currentBuyerName", roleName);
    localStorage.setItem("currentBuyerEmail", user.email ?? "No email saved");
    const email = user.email?.trim();
    if (email) {
      try {
        const res = await fetch(`/api/customers?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const c = (await res.json()) as { id: string; phone?: string };
          localStorage.setItem("currentBuyerId", c.id);
          if (c.phone) localStorage.setItem("currentBuyerPhone", c.phone);
        }
      } catch {
        /* ignore */
      }
    }
  };

  async function syncBuyerCustomerAfterAuth(user: { id: string; email?: string | null }, email: string, phoneNorm: string) {
    const name = email.split("@")[0] || "Buyer";
    const existingRes = await fetch(`/api/customers?email=${encodeURIComponent(email)}`);
    if (existingRes.ok) {
      const c = (await existingRes.json()) as { id: string };
      const put = await fetch(`/api/customers/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNorm }),
      });
      if (!put.ok) throw new Error("Could not update your phone number.");
      localStorage.setItem("currentBuyerId", c.id);
      return;
    }
    const post = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        name,
        email,
        phone: phoneNorm,
        address: "",
        totalOrders: 0,
        totalSpent: 0,
      }),
    });
    if (!post.ok) throw new Error("Could not create your buyer profile.");
    localStorage.setItem("currentBuyerId", user.id);
  }

  /** Ensures a customers row exists after email/password sign-up (phone added on the next step). */
  async function ensureBuyerCustomerRecord(user: { id: string; email?: string | null }, email: string) {
    const name = email.split("@")[0] || "Buyer";
    const existingRes = await fetch(`/api/customers?email=${encodeURIComponent(email)}`);
    if (existingRes.ok) {
      const c = (await existingRes.json()) as { id: string };
      localStorage.setItem("currentBuyerId", c.id);
      return;
    }
    const post = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        name,
        email,
        phone: "",
        address: "",
        totalOrders: 0,
        totalSpent: 0,
      }),
    });
    if (!post.ok) throw new Error("Could not create your buyer profile.");
    localStorage.setItem("currentBuyerId", user.id);
  }

  async function finishAuthAfterSignIn(userEmail?: string): Promise<boolean> {
    if (isAdminRole) {
      const allowed = await hasAdminAccess();
      if (!allowed) {
        await supabase.auth.signOut();
        setError("Admin access denied. Contact the system owner.");
        return false;
      }
    }

    if (role === "buyer" && userEmail && (await gateBuyerPhoneIfNeeded(userEmail))) {
      return false;
    }

    await persistSessionProfile();
    router.replace(nextPath);
    return true;
  }

  async function gateBuyerPhoneIfNeeded(userEmail: string): Promise<boolean> {
    if (role !== "buyer") return false;
    const custRes = await fetch(`/api/customers?email=${encodeURIComponent(userEmail)}`);
    const customer = custRes.ok ? ((await custRes.json()) as { id?: string; phone?: string }) : null;
    const okPhone = Boolean(customer && countPhoneDigits(customer.phone ?? "") >= 9);
    if (!okPhone) {
      setBuyerFlowStep("phone");
      setPhone((customer?.phone ?? "").trim());
      return true;
    }
    return false;
  }

  const completeBuyerPhoneGate = async () => {
    setError(null);
    if (countPhoneDigits(phone) < 9) {
      setError("Enter a valid mobile number (9+ digits).");
      return;
    }
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        setError("Session expired. Sign in again.");
        return;
      }
      const email = user.email.trim();
      await syncBuyerCustomerAfterAuth(user, email, phone.trim());
      await persistSessionProfile();
      setBuyerFlowStep("signin");
      router.replace(nextPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your phone number.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!googleAuthEnabled) {
      setError(
        "Google sign-in is not configured. Add NEXT_PUBLIC_FIREBASE_* to .env (or your host’s env), then restart the dev server or redeploy.",
      );
      return;
    }

    setError(null);
    setSuccess(null);
    setGoogleLoading(true);

    try {
      const { idToken, accessToken } = await getGoogleIdTokenFromFirebase();
      const { data, error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
        access_token: accessToken,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const user = data.user;
      const userEmail = user?.email?.trim();

      if (role === "buyer" && user && userEmail) {
        try {
          await ensureBuyerCustomerRecord(user, userEmail);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not save your buyer profile.");
          await supabase.auth.signOut();
          return;
        }
      }

      await finishAuthAfterSignIn(userEmail);
    } catch (e) {
      if (e instanceof GoogleSignInCancelledError) {
        return;
      }
      setError(e instanceof Error ? e.message : "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSignInOrSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const signInResult = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInResult.error) {
        const userEmail = signInResult.data.user?.email?.trim();
        if (await finishAuthAfterSignIn(userEmail)) {
          return;
        }
        return;
      }

      const signInMsg = signInResult.error.message.toLowerCase();

      if (signInMsg.includes("email not confirmed")) {
        setError(
          "This email is already registered but not verified. Check your inbox for the confirmation link before signing in.",
        );
        return;
      }

      const invalidLogin = signInMsg.includes("invalid login credentials");

      if (!invalidLogin) {
        setError(signInResult.error.message);
        return;
      }

      if (isAdminRole) {
        setError("Invalid admin credentials. Admin accounts must be created and granted by the owner.");
        return;
      }

      const trimmedEmail = email.trim();
      const checkRes = await fetch("/api/auth/check-email-registered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, portal: role }),
      });

      if (!checkRes.ok) {
        setError("Could not verify this email. Please try again in a moment.");
        return;
      }

      const checkBody = (await checkRes.json()) as { registered?: boolean };
      if (checkBody.registered) {
        setError(
          "An account with this email already exists. Check your password or use Forgot password below.",
        );
        return;
      }

      const origin = window.location.origin;
      const signUpResult =
        role === "buyer"
          ? await supabase.auth.signUp({
              email: trimmedEmail,
              password,
              options: {
                emailRedirectTo: `${origin}/auth?role=buyer&next=${encodeURIComponent(nextPath)}`,
              },
            })
          : await supabase.auth.signUp({ email: trimmedEmail, password });

      if (signUpResult.error) {
        const signUpMsg = signUpResult.error.message.toLowerCase();
        if (signUpMsg.includes("already registered") || signUpMsg.includes("already been registered")) {
          setError(
            "An account with this email already exists. Check your password or use Forgot password below.",
          );
          return;
        }
        setError(signUpResult.error.message);
        return;
      }

      const signupUser = signUpResult.data.user;
      const session = signUpResult.data.session;

      if (!session && signupUser && (!signupUser.identities || signupUser.identities.length === 0)) {
        setError(
          "This email already has a login. Use the same password to sign in here, or reset it with Forgot password.",
        );
        return;
      }

      if (!session) {
        setSuccess(
          role === "buyer"
            ? "Check your email to verify, then sign in."
            : "Check your email to verify, then sign in.",
        );
        return;
      }

      if (role === "buyer" && signupUser) {
        const buyerEmail = signupUser.email?.trim() || trimmedEmail;
        try {
          await ensureBuyerCustomerRecord(signupUser, buyerEmail);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not save your buyer profile.");
          await supabase.auth.signOut();
          return;
        }
        if (await gateBuyerPhoneIfNeeded(buyerEmail)) {
          setLoading(false);
          return;
        }
      }

      await finishAuthAfterSignIn(signupUser?.email?.trim() || trimmedEmail);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const origin = window.location.origin;
      // Must match an entry under Supabase → Authentication → URL Configuration → Redirect URLs
      // (e.g. https://your-domain.com/** or http://localhost:3000/**), or users are sent to Site URL (often /).
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess("Reset link sent — check your email.");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return <AuthSkeleton />;
  }

  return (
    <AuthPageBackground>
      <Card className={authCardClassName}>
        <div className="space-y-5 p-5 sm:p-7">
          <AuthBrandBanner />
        {buyerFlowStep === "phone" && role === "buyer" ? (
          <>
            <AuthFormHeader
              badge="Buyer"
              title="Your mobile number"
              description="So providers can reach you for service requests."
            />
            <div className="space-y-3">
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="07… or 256…"
                className={authFieldClassName}
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => void completeBuyerPhoneGate()}
                className={authPrimaryButtonClassName}
              >
                {loading ? "Saving…" : "Continue"}
              </button>
            </div>
            {error ? <AuthMessage variant="error">{error}</AuthMessage> : null}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  void supabase.auth.signOut();
                  setBuyerFlowStep("signin");
                  setError(null);
                }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground sm:text-sm"
              >
                Different account
              </button>
            </div>
          </>
        ) : (
          <>
            <AuthFormHeader
              badge={roleMeta.badge}
              title={roleMeta.title}
              description={roleMeta.description}
            />

            {mode === "signin" ? (
              <div className="space-y-3">
                <AuthGoogleButton
                  loading={googleLoading}
                  disabled={loading || !googleAuthEnabled}
                  onClick={() => void handleGoogleSignIn()}
                />
                {!googleAuthEnabled ? (
                  <AuthMessage variant="info">
                    Google sign-in needs Firebase env vars in <code className="text-[11px]">.env</code> and a
                    server restart (or redeploy on production).
                  </AuthMessage>
                ) : null}
                <AuthDivider />
              <form className="space-y-3" onSubmit={handleSignInOrSignUp}>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  className={authFieldClassName}
                />
                <div className="relative">
                  <input
                    required
                    minLength={6}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password (6+ characters)"
                    className={`${authFieldClassName} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={authPrimaryButtonClassName}
                >
                  {loading ? "Please wait…" : "Continue"}
                </button>
              </form>
              </div>
            ) : (
              <form className="space-y-3" onSubmit={handleForgotPassword}>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  className={authFieldClassName}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className={authPrimaryButtonClassName}
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            )}

            {authError === "admin_required" ? (
              <AuthMessage variant="error">This account is not an admin.</AuthMessage>
            ) : null}
            {error ? <AuthMessage variant="error">{error}</AuthMessage> : null}
            {success ? <AuthMessage variant="success">{success}</AuthMessage> : null}

            <AuthCardFooter>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setMode(mode === "signin" ? "forgot" : "signin");
                }}
                className="font-medium text-primary hover:underline"
              >
                {mode === "signin" ? "Forgot password?" : "Back to sign in"}
              </button>
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                Shop
              </Link>
            </AuthCardFooter>
          </>
        )}
        </div>
      </Card>
    </AuthPageBackground>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <AuthForm />
    </Suspense>
  );
}
