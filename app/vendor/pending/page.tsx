'use client';

import { Clock3 } from 'lucide-react';
import { PortalPendingScreen } from '@/components/portal-pending-screen';

export default function VendorPendingVerificationPage() {
  return (
    <PortalPendingScreen
      portalLabel="Supplier"
      icon={Clock3}
      accent="amber"
      authRole="vendor"
      authNext="/vendor"
      onSignOutCleanup={() => {
        localStorage.removeItem('currentVendorId');
        localStorage.removeItem('currentVendorName');
      }}
    />
  );
}
