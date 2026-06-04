import type { Metadata } from 'next';

import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata('Order confirmation');

export default function OrderConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
