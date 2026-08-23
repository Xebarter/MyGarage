'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function MobileAppBar({
  title,
  backHref,
  onBack,
  actions,
  sticky = true,
}: {
  title: string;
  backHref?: string;
  onBack?: () => void;
  actions?: ReactNode;
  sticky?: boolean;
}) {
  const router = useRouter();
  const showBack = Boolean(backHref || onBack);

  const backClass =
    'absolute left-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-[#0B1220]';

  return (
    <header className={cn('z-30 bg-[#F2F4F8]', sticky && 'sticky top-0')}>
      <div className="relative flex h-14 items-center justify-center px-12">
        {showBack ? (
          backHref ? (
            <Link href={backHref} aria-label="Back" className={backClass}>
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              aria-label="Back"
              className={backClass}
              onClick={() => (onBack ? onBack() : router.back())}
            >
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>
          )
        ) : null}

        <div className="flex min-w-0 max-w-[70%] items-center justify-center gap-2.5">
          <Image
            src="/icon0.svg"
            alt=""
            width={26}
            height={26}
            className="h-[26px] w-[26px] shrink-0 rounded-[6px] border border-[#EEF2F7] object-contain shadow-[0_2px_6px_rgba(11,18,32,0.06)]"
          />
          <span className="truncate text-xl font-bold tracking-tight text-[#0B1220]">{title}</span>
        </div>

        {actions ? <div className="absolute right-2 top-1/2 -translate-y-1/2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function MobileAppPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-h-dvh overflow-x-hidden bg-[#F2F4F8] md:hidden', className)}>
      {children}
    </div>
  );
}
