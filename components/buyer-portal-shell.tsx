'use client';

import { usePathname } from 'next/navigation';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { BuyerSidebar } from '@/components/buyer-sidebar';
import { BuyerPortalChromeProvider } from '@/components/buyer-portal-chrome';

/** Public booking page uses storefront header scroll (logo hides, search stays). */
function isServicesMarketplacePage(pathname: string): boolean {
  return pathname === '/buyer/services';
}

export function BuyerPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isServicesMarketplacePage(pathname)) {
    return (
      <div className="flex min-h-dvh flex-col bg-muted/20">
        <Header />
        <div className="flex flex-1 flex-col md:flex-row">
          <BuyerPortalChromeProvider>
            <div className="hidden md:sticky md:top-16 md:z-30 md:block md:h-[calc(100dvh-4rem)] md:w-64 md:shrink-0 md:self-start md:overflow-y-auto">
              <BuyerSidebar />
            </div>
          </BuyerPortalChromeProvider>
          <div className="flex min-w-0 flex-1 flex-col">
            {children}
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <BuyerPortalChromeProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-muted/20">
        <div className="shrink-0">
          <Header />
        </div>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <BuyerSidebar />
          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
        </div>
      </div>
    </BuyerPortalChromeProvider>
  );
}
