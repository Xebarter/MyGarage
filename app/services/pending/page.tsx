'use client';

import { Wrench } from 'lucide-react';
import { PortalPendingScreen } from '@/components/portal-pending-screen';

export default function ServicesPendingVerificationPage() {
  return (
    <PortalPendingScreen
      portalLabel="Services"
      icon={Wrench}
      accent="violet"
      authRole="services"
      authNext="/services"
      onSignOutCleanup={() => {
        localStorage.removeItem('currentServiceProviderName');
        localStorage.removeItem('currentServiceProviderServices');
        localStorage.removeItem('currentVendorId');
        localStorage.removeItem('currentVendorName');
      }}
    />
  );
}
