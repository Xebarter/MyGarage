'use client';

import { Header } from '@/components/header';
import { BuyerSidebar } from '@/components/buyer-sidebar';
import { BuyerPortalChromeProvider } from '@/components/buyer-portal-chrome';

export function BuyerPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <BuyerPortalChromeProvider>
      <div className="flex min-h-dvh flex-col bg-muted/20">
        <Header />
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <BuyerSidebar />
          <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </BuyerPortalChromeProvider>
  );
}
