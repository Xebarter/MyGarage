'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, Package } from 'lucide-react';
import { AdminSidebar } from '@/components/admin-sidebar';

export function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const mq = window.matchMedia('(min-width: 768px)');
    if (mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen, closeMobile]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <header className="fixed top-0 left-0 right-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-accent hover:text-accent-foreground"
          aria-expanded={mobileNavOpen}
          aria-controls="admin-dashboard-nav"
          aria-label="Open admin menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/admin" className="flex min-w-0 items-center gap-2 font-semibold text-foreground">
          <Package className="h-7 w-7 shrink-0" />
          <span className="truncate">MyGarage Admin</span>
        </Link>
      </header>

      <AdminSidebar mobileOpen={mobileNavOpen} onMobileClose={closeMobile} />

      <main className="min-h-0 flex-1 overflow-y-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
