"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";

export default function ServicesPendingVerificationPage() {
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => setEmail((data.user?.email ?? "").trim()));
  }, []);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-4 py-10">
      <Card className="w-full rounded-2xl border-border/70 p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Service provider workspace
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          Pending admin verification
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your service-provider dashboard will become active after an admin verifies your account.
        </p>
        {email ? (
          <p className="mt-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
            Signed in as <span className="font-medium text-foreground">{email}</span>
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium hover:bg-muted/50"
          >
            Back to site
          </Link>
          <Link
            href="/buyer"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Go to buyer dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
}

