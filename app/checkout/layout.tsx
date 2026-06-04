import type { Metadata } from 'next';

import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata('Checkout');

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
