"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "forgot";

function countPhoneDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

interface ConflictSession {
  role: string;
  displayName: string;
}

function getDefaultNext(role: string) {
  if (role === "vendor") return "/vendor";
  if (role === "services") return "/services";
  if (role === "admin") return "/admin";
  if (role === "buyer") return "/buyer";
  return "/";
}

function getRoleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "vendor") return "Vendor";
  if (role === "services") return "Service Provider";
  if (role === "buyer") return "Buyer";
  return "Current Account";
}

function AuthSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md space-y-5 p-6 md:p-8">
        <div className="space-y-3">
          <div className="mx-auto h-7 w-40 animate-pulse rounded-md bg-muted" />
          <div className="mx-auto h-4 w-56 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="space-y-3">
          <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
        </div>
      </Card>
    </div>
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

  const [conflictSession, setConflictSession] = useState<ConflictSession | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const title = useMemo(() => {
    if (role === "admin") return "Admin Access";
    if (role === "vendor") return "Vendor Access";
    if (role === "services") return "Service Provider Access";
    return "Buyer Access";
  }, [role]);

  useEffect(() => {
    setPhone("");
    setBuyerFlowStep("signin");
  }, [role]);

  // Re-run whenever the target portal changes so stale conflict state is cleared
  useEffect(() => {
    let cancelled = false;

    setSessionChecked(false);
    setConflictSession(null);
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

      // Determine the role of the active session
      const appRole = String(user.app_metadata?.role ?? "").toLowerCase();
      const appRoles = Array.isArray(user.app_metadata?.roles)
        ? (user.app_metadata.roles as unknown[]).map((r) => String(r).toLowerCase())
        : [];
      const isAdminUser = appRole === "admin" || appRoles.includes("admin");

      let activeRole = "unknown";
      let displayName = user.email ?? "your account";

      if (isAdminUser) {
        activeRole = "admin";
        displayName = user.email ?? "Admin";
      } else {
        const vendorName = localStorage.getItem("currentVendorName");
        const serviceName = localStorage.getItem("currentServiceProviderName");
        const buyerName = localStorage.getItem("currentBuyerName");

        if (vendorName) {
          activeRole = "vendor";
          displayName = vendorName;
        } else if (serviceName) {
          activeRole = "services";
          displayName = serviceName;
        } else if (buyerName) {
          activeRole = "buyer";
          displayName = buyerName;
        }
      }

      if (cancelled) return;

      // Already signed into the same portal — redirect straight to the dashboard
      if (activeRole === role) {
        if (role === "buyer" && user.email) {
          const custRes = await fetch(`/api/customers?email=${encodeURIComponent(user.email.trim())}`);
          const customer = custRes.ok ? ((await custRes.json()) as { phone?: string }) : null;
          const okPhone = Boolean(customer && countPhoneDigits(customer.phone ?? "") >= 9);
          if (!okPhone) {
            setBuyerFlowStep("phone");
            setPhone((customer?.phone ?? "").trim());
            setSessionChecked(true);
            return;
          }
        }
        router.replace(nextPath);
        return;
      }

      // Different portal — show conflict prompt
      setConflictSession({ role: activeRole, displayName });
      setSessionChecked(true);
    };

    checkSession();
    return () => {
      cancelled = true;
    };
  }, [role, nextPath, router, supabase.auth]);

  // Sign out of the current session so the user can log into the requested portal
  const handleSignOutAndContinue = async () => {
    setConflictLoading(true);
    localStorage.removeItem("currentVendorId");
    localStorage.removeItem("currentVendorName");
    localStorage.removeItem("currentServiceProviderName");
    localStorage.removeItem("currentBuyerName");
    localStorage.removeItem("currentBuyerEmail");
    localStorage.removeItem("currentBuyerId");
    localStorage.removeItem("currentBuyerPhone");
    localStorage.removeItem("buyerProfile");
    await supabase.auth.signOut();
    setConflictSession(null);
    setConflictLoading(false);
  };

  const goToCurrentDashboard = () => {
    router.push(getDefaultNext(conflictSession!.role));
  };

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

  const completeBuyerPhoneGate = async () => {
    setError(null);
    if (countPhoneDigits(phone) < 9) {
      setError("Enter a valid mobile number (at least 9 digits) so service providers can reach you.");
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
        if (isAdminRole) {
          const allowed = await hasAdminAccess();
          if (!allowed) {
            await supabase.auth.signOut();
            setError("Admin access denied. Ask the system owner to grant your account admin role.");
            return;
          }
        }
        if (role === "buyer") {
          const user = signInResult.data.user;
          const userEmail = user?.email?.trim();
          if (userEmail) {
            const custRes = await fetch(`/api/customers?email=${encodeURIComponent(userEmail)}`);
            const customer = custRes.ok ? ((await custRes.json()) as { id?: string; phone?: string }) : null;
            const okPhone = Boolean(customer && countPhoneDigits(customer.phone ?? "") >= 9);
            if (!okPhone) {
              setBuyerFlowStep("phone");
              setPhone((customer?.phone ?? "").trim());
              setLoading(false);
              return;
            }
          }
        }
        await persistSessionProfile();
        router.replace(nextPath);
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

      if (role === "buyer" && countPhoneDigits(phone) < 9) {
        setError("Enter a valid mobile number (at least 9 digits) so service providers can reach you.");
        setLoading(false);
        return;
      }

      const signUpResult = await supabase.auth.signUp({ email: trimmedEmail, password });

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
        setSuccess("Account created. Please verify your email before signing in.");
        return;
      }

      if (role === "buyer" && signupUser) {
        try {
          await syncBuyerCustomerAfterAuth(signupUser, trimmedEmail, phone.trim());
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not save your buyer profile.");
          await supabase.auth.signOut();
          return;
        }
      }

      await persistSessionProfile();
      router.replace(nextPath);
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
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess("Password reset link sent. Check your email.");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return <AuthSkeleton />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md space-y-5 p-6 md:p-8">
        {conflictSession ? (
          <>
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-bold">Already Signed In</h1>
              <p className="text-sm text-muted-foreground">
                Sign out of your current account to access the {getRoleLabel(role)} portal.
              </p>
            </div>

            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm space-y-0.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Currently signed in as
              </p>
              <p className="font-medium text-foreground truncate">{conflictSession.displayName}</p>
              <p className="text-xs text-muted-foreground">
                {getRoleLabel(conflictSession.role)} account
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSignOutAndContinue}
                disabled={conflictLoading}
                className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {conflictLoading
                  ? "Signing out…"
                  : `Sign out & access ${getRoleLabel(role)} portal`}
              </button>
              {conflictSession.role !== "unknown" && (
                <button
                  type="button"
                  onClick={goToCurrentDashboard}
                  disabled={conflictLoading}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
                >
                  Stay in {getRoleLabel(conflictSession.role)} dashboard
                </button>
              )}
            </div>

            <div className="flex justify-center text-sm">
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                Back to site
              </Link>
            </div>
          </>
        ) : buyerFlowStep === "phone" && role === "buyer" ? (
          <>
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-bold">Add your mobile number</h1>
              <p className="text-sm text-muted-foreground">
                Service providers see this number when you request help, so they can call or message you.
              </p>
            </div>
            <div className="space-y-3">
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="e.g. 07… or 256…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => void completeBuyerPhoneGate()}
                className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? "Saving…" : "Save and continue"}
              </button>
            </div>
            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}
            <div className="flex justify-center text-sm">
              <button
                type="button"
                onClick={() => {
                  void supabase.auth.signOut();
                  setBuyerFlowStep("signin");
                  setError(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Use a different account
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1 text-center">
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">
                {isAdminRole
                  ? "Admins can only sign in after role approval."
                  : role === "buyer"
                    ? "Sign in with email and password. New accounts need a mobile number for service requests."
                    : "Simple access with email and password."}
              </p>
            </div>

            {mode === "signin" ? (
              <form className="space-y-3" onSubmit={handleSignInOrSignUp}>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  required
                  minLength={6}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                {role === "buyer" ? (
                  <>
                    <input
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="Mobile number"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Required when you are creating a new account. If you already have an account with a saved phone, you can leave this as-is when signing in.
                    </p>
                  </>
                ) : null}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Please wait…" : "Continue"}
                </button>
              </form>
            ) : (
              <form className="space-y-3" onSubmit={handleForgotPassword}>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
            )}

            {authError === "admin_required" ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                This account is not an admin. Ask the system owner to grant admin role.
              </p>
            ) : null}
            {error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}
            {success ? (
              <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{success}</p>
            ) : null}

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setMode(mode === "signin" ? "forgot" : "signin");
                }}
                className="text-primary underline-offset-4 hover:underline"
              >
                {mode === "signin" ? "Forgot password?" : "Back to sign in"}
              </button>
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                Back to site
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <AuthForm />
    </Suspense>
  );
}
