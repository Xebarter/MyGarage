"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md space-y-5 p-6 md:p-8">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Set New Password</h1>
          <p className="text-sm text-muted-foreground">Use a secure password you can remember.</p>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        {success ? <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{success}</p> : null}

        <div className="text-center text-sm">
          <Link href="/auth" className="text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
