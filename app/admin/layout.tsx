import type { Metadata } from 'next';

import { AdminDashboardShell } from '@/components/admin-dashboard-shell';
import { buildNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildNoIndexMetadata(
  'Admin dashboard',
  'MyGarage administration area.',
);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminDashboardShell>{children}</AdminDashboardShell>;
}
