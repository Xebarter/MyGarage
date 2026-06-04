'use client';

import { Header } from '@/components/header';
import { ServiceProviderSidebar } from '@/components/service-provider-sidebar';
import { ServicesPortalChromeProvider } from '@/components/services-portal-chrome';

export function ServicesPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <ServicesPortalChromeProvider>
      <div className="flex min-h-dvh flex-col bg-muted/20">
        <Header />
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <ServiceProviderSidebar />
          <main className="min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ServicesPortalChromeProvider>
  );
}
