"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "forgot";

function getDefaultNext(role: string) {
  if (role === "vendor") return "/vendor";
  if (role === "services") return "/services";
  return "/buyer";
}

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [query] = useState(() => {
    if (typeof window === "undefined") return { role: "buyer", next: "", error: "" };
    const params = new URLSearchParams(window.location.search);
    return {
      role: (params.get("role") ?? "buyer").toString(),
      next: (params.get("next") ?? "").toString(),
      error: (params.get("error") ?? "").toString(),
    };
  });

  const role = query.role || "buyer";
  const nextPath = query.next || getDefaultNext(role);
  const authError = query.error || null;
  const isAdminRole = role === "admin";

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => {
    if (role === "admin") return "Admin Access";
    if (role === "vendor") return "Vendor Access";
    if (role === "services") return "Service Provider Access";
    return "Buyer Access";
  }, [role]);

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

      // Supabase may return a stub user (no identities) for existing emails when confirmation toggles obfuscate duplicates.
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md space-y-5 p-6 md:p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdminRole
              ? "Admins can only sign in after role approval."
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
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Continue"}
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
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        {authError === "admin_required" ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            This account is not an admin. Ask the system owner to grant admin role.
          </p>
        ) : null}
        {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        {success ? <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{success}</p> : null}

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
      </Card>
    </div>
  );
}
