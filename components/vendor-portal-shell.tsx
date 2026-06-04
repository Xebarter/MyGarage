'use client';

import { Header } from '@/components/header';
import { VendorSidebar } from '@/components/vendor-sidebar';
import { VendorPortalChromeProvider } from '@/components/vendor-portal-chrome';

export function VendorPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <VendorPortalChromeProvider>
      <div className="flex min-h-dvh flex-col bg-muted/20">
        <Header />
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <VendorSidebar />
          <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </VendorPortalChromeProvider>
  );
}
