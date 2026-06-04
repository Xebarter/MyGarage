import { BuyerPortalShell } from '@/components/buyer-portal-shell';

export default function BuyerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BuyerPortalShell>{children}</BuyerPortalShell>;
}
