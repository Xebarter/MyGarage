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
    <div className="overflow-x-auto rounded-lg border border-border bg-card p-2">
      <div className="flex min-w-max items-center gap-2">
        {links.map((link) => {
          const href = `/admin/vendors/${vendorId}${link.slug ? `/${link.slug}` : ''}`;
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
