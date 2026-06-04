import type { Metadata } from 'next';

import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata('Payment');

export default function PaymentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
