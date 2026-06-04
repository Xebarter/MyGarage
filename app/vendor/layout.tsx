import { VendorPortalShell } from '@/components/vendor-portal-shell';

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <VendorPortalShell>{children}</VendorPortalShell>;
}
