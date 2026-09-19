'use client';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { BuyerSidebar } from '@/components/buyer-sidebar';
import { BuyerPortalChromeProvider } from '@/components/buyer-portal-chrome';
import { MobileAppBottomNav } from '@/components/mobile-app-bottom-nav';

const mobileAppFooterPad = 'pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0';

export function BuyerPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <BuyerPortalChromeProvider>
      <div className={`flex min-h-dvh flex-col bg-muted/20 ${mobileAppFooterPad}`}>
        <Header />
        <div className="flex flex-1 flex-col md:flex-row">
          <div className="md:sticky md:top-16 md:z-30 md:h-[calc(100dvh-4rem)] md:w-64 md:shrink-0 md:self-start md:overflow-y-auto">
            <BuyerSidebar />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </div>
        <MobileAppBottomNav />
      </div>
    </BuyerPortalChromeProvider>
  );
}
