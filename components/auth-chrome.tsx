"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/** Shared field styles for auth / reset-password forms */
export const authFieldClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground shadow-sm transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35";

export const authPrimaryButtonClassName =
  "w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60";

export const authSecondaryButtonClassName =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted disabled:opacity-60";

export const authCardClassName =
  "w-full max-w-md overflow-hidden border-border/80 bg-card/95 shadow-lg shadow-black/[0.06] backdrop-blur-sm dark:border-border dark:shadow-black/25";

export function AuthPageBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-muted/50 via-background to-background px-4 py-10 md:py-14">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 max-h-[50vh] bg-gradient-to-b from-primary/[0.10] to-transparent dark:from-primary/[0.06]"
        aria-hidden
      />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}

export function AuthBrandBanner() {
  return (
    <div className="border-b border-border/80 pb-6">
      <Link
        href="/"
        className="mx-auto flex w-fit max-w-full items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors hover:bg-muted/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      >
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-card to-muted/30 shadow-sm ring-1 ring-border/70">
          <Image
            src="/icon0.svg"
            alt=""
            width={48}
            height={48}
            className="h-11 w-11 object-contain"
            priority
          />
        </span>
        <span className="text-2xl font-bold tracking-tight text-foreground">MyGarage</span>
      </Link>
    </div>
  );
}
