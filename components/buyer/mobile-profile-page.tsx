'use client';

import { useSearchParams } from 'next/navigation';

import { MobileProfileHub, MobileProfileSectionChrome } from '@/components/buyer/mobile-profile-hub';
import { ProfileControlCenter } from '@/components/buyer/profile-control-center';

export function MobileProfilePage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const resolved = tab === 'subscriptions' ? 'membership' : tab;

  if (!resolved) {
    return <MobileProfileHub />;
  }

  return (
    <MobileProfileSectionChrome tab={resolved}>
      <ProfileControlCenter embed />
    </MobileProfileSectionChrome>
  );
}
