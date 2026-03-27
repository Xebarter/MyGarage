import { VendorSidebar } from '@/components/vendor-sidebar';

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/20 md:h-screen md:flex-row">
      <VendorSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
