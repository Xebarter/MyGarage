import { AdminDashboardShell } from '@/components/admin-dashboard-shell';

export const metadata = {
  title: 'Admin Dashboard - MyGarage',
  description: 'Manage your e-commerce store',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminDashboardShell>{children}</AdminDashboardShell>;
}
