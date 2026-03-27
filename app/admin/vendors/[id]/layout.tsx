import { VendorWorkspaceNav } from '@/components/admin/vendor-workspace-nav';

export default async function VendorWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <VendorWorkspaceNav vendorId={id} />
      {children}
    </div>
  );
}
