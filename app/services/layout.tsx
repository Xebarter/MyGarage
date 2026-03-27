import { ServiceProviderSidebar } from '@/components/service-provider-sidebar';

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/20 md:h-screen md:flex-row">
      <ServiceProviderSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
