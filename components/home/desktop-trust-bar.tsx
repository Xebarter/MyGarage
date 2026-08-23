import { CreditCard, Headphones, ShieldCheck, Truck } from 'lucide-react';

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Verified vendors',
    detail: 'Sourced from trusted suppliers.',
  },
  {
    icon: CreditCard,
    title: 'Secure payments',
    detail: 'Encrypted checkout.',
  },
  {
    icon: Truck,
    title: 'Nationwide dispatch',
    detail: 'Dependable delivery in Uganda.',
  },
  {
    icon: Headphones,
    title: 'Fitment support',
    detail: 'Specialists on call, Mon–Sat.',
  },
] as const;

export function DesktopTrustBar() {
  return (
    <section
      aria-label="Why MyGarage"
      className="border-b border-white/10 bg-[#0B1220]"
    >
      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-2 gap-px bg-white/10 lg:grid-cols-4">
        {TRUST_ITEMS.map(({ icon: Icon, title, detail }) => (
          <div
            key={title}
            className="flex items-start gap-3.5 bg-[#0B1220] px-5 py-5 lg:px-7 lg:py-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight text-white">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/55">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
