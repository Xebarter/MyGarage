import { MobileAppAuthReturn } from '@/components/auth/mobile-app-auth-return';

export const metadata = {
  title: 'Returning to MyGarage Supplier',
  robots: { index: false, follow: false },
};

/**
 * OAuth bridge for the Flutter supplier app.
 * Supabase redirects here (HTTPS, allowlisted), then we open:
 * ug.mygarage.supplier://login-callback
 */
export default function SupplierMobileAuthCallbackPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Sign-in complete</h1>
        <p className="text-sm text-muted-foreground">Returning you to MyGarage Supplier…</p>
        <MobileAppAuthReturn
          deepLinkBase="ug.mygarage.supplier://login-callback"
          appLabel="MyGarage Supplier"
        />
      </div>
    </main>
  );
}
