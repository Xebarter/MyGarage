'use client';

import { Clock3 } from 'lucide-react';
import { PortalPendingScreen } from '@/components/portal-pending-screen';

export default function VendorPendingVerificationPage() {
  return (
    <PortalPendingScreen
      portalLabel="Vendor dashboard"
      icon={Clock3}
      accent="amber"
      steps={[
        { id: 'submitted', label: 'Received', done: true },
        { id: 'review', label: 'Review', active: true },
        { id: 'access', label: 'Live' },
      ]}
      authRole="vendor"
      authNext="/vendor"
      onSignOutCleanup={() => {
        localStorage.removeItem('currentVendorId');
        localStorage.removeItem('currentVendorName');
      }}
    />
  );
}
