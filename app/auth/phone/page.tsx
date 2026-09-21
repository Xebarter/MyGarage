import { Card } from '@/components/ui/card';
import { PhoneSignIn } from '@/components/auth/phone-sign-in';
import { AuthBrandBanner, AuthPageBackground, authCardClassName } from '@/components/auth-chrome';
import { isSafeAuthNext } from '@/lib/auth-next';

export const metadata = {
  title: 'Sign in with phone',
  robots: { index: false, follow: false },
};

function defaultNext(role: string) {
  if (role === 'vendor') return '/vendor';
  if (role === 'services') return '/services/orders';
  if (role === 'admin') return '/admin';
  return '/buyer';
}

export default async function PhoneAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; origin?: string; role?: string; next?: string; channel?: string }>;
}) {
  const params = await searchParams;
  const role = (params.role ?? 'buyer').trim() || 'buyer';
  const nextPath = isSafeAuthNext(params.next) ? params.next : defaultNext(role);

  return (
    <AuthPageBackground>
      <Card className={`${authCardClassName} overflow-visible`}>
        <div className="space-y-5 p-5 sm:p-7">
          <AuthBrandBanner />
          <PhoneSignIn
            initialPhone={(params.phone ?? '').trim()}
            openerOrigin={(params.origin ?? '').trim()}
            role={role}
            nextPath={nextPath}
            channel={(params.channel ?? '').trim()}
          />
        </div>
      </Card>
    </AuthPageBackground>
  );
}
