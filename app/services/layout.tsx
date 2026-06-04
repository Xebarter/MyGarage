import { ServicesPortalShell } from '@/components/services-portal-shell';

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ServicesPortalShell>{children}</ServicesPortalShell>;
}
