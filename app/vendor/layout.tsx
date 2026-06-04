import type { Metadata } from 'next';

import { VendorPortalShell } from '@/components/vendor-portal-shell';
import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata('Vendor portal');

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VendorPortalShell>{children}</VendorPortalShell>;
}
