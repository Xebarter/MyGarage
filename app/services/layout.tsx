import type { Metadata } from 'next';

import { ServicesPortalShell } from '@/components/services-portal-shell';
import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata('Service provider portal');

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ServicesPortalShell>{children}</ServicesPortalShell>;
}
