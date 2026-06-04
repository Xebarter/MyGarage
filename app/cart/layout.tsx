import type { Metadata } from 'next';

import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata('Shopping cart');

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
