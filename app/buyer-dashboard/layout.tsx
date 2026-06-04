import type { Metadata } from 'next';

import { BuyerPortalShell } from '@/components/buyer-portal-shell';
import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata('Buyer account');

export default function BuyerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BuyerPortalShell>{children}</BuyerPortalShell>;
}
