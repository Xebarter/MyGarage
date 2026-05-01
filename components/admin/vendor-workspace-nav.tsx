'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { slug: '', label: 'Overview' },
  { slug: 'products', label: 'Products' },
  { slug: 'orders', label: 'Orders' },
  { slug: 'analytics', label: 'Analytics' },
  { slug: 'settings', label: 'Settings' },
];

export function VendorWorkspaceNav({ vendorId }: { vendorId: string }) {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/80 p-1.5 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-sm dark:ring-white/[0.06]">
      <nav className="flex min-w-max items-center gap-1" aria-label="Vendor workspace">
        {links.map((link) => {
          const href = `/admin/vendors/${vendorId}${link.slug ? `/${link.slug}` : ''}`;
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
