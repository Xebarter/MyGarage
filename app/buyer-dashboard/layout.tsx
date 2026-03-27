import { BuyerSidebar } from '@/components/buyer-sidebar';

export default function BuyerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/20 md:h-screen md:flex-row">
      <BuyerSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
