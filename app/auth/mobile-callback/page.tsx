import { MobileAppAuthReturn } from '@/components/auth/mobile-app-auth-return';

export const metadata = {
  title: 'Returning to MyGarage',
  robots: { index: false, follow: false },
};

/** OAuth bridge for the buyer Flutter app: Supabase → here → mygarage://login-callback. */
export default function MobileAuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF6EA] px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-black/[0.06] bg-white p-8 text-center shadow-[0_16px_40px_-24px_rgba(18,36,28,0.35)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0E9A6A]">MyGarage</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#1A241F]">Opening the app</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#4A5C54]">
          Sign-in succeeded. Return to MyGarage to continue shopping and booking services.
        </p>
        <MobileAppAuthReturn deepLinkBase="mygarage://login-callback" appLabel="MyGarage" />
      </div>
    </main>
  );
}
