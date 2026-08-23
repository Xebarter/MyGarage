'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { MobileProfilePage } from '@/components/buyer/mobile-profile-page';
import { ProfileControlCenter } from '@/components/buyer/profile-control-center';

export default function BuyerProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
      <div className="md:hidden">
        <MobileProfilePage />
      </div>
      <div className="hidden md:block">
        <ProfileControlCenter />
      </div>
    </Suspense>
  );
}
