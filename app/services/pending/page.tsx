'use client';

import { Wrench } from 'lucide-react';
import { PortalPendingScreen } from '@/components/portal-pending-screen';

export default function ServicesPendingVerificationPage() {
  return (
    <PortalPendingScreen
      portalLabel="Services dashboard"
      icon={Wrench}
      accent="violet"
      steps={[
        { id: 'submitted', label: 'Received', done: true },
        { id: 'review', label: 'Review', active: true },
        { id: 'access', label: 'Live' },
      ]}
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
