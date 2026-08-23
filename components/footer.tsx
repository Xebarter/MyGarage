import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Clock,
  CreditCard,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Truck,
} from 'lucide-react';

const containerClass = 'mx-auto w-full max-w-[1500px] px-4 sm:px-5 md:px-6 lg:px-8';

const trustHighlights = [
  {
    icon: ShieldCheck,
    label: 'Verified vendors',
    detail: 'Sourced from trusted suppliers',
  },
  {
    icon: CreditCard,
    label: 'Secure payments',
    detail: 'Encrypted checkout',
  },
  {
    icon: Truck,
    label: 'Nationwide dispatch',
    detail: 'Dependable delivery in Uganda',
  },
  {
    icon: Headphones,
    label: 'Fitment support',
    detail: 'Specialists on call Mon–Sat',
  },
] as const;

const shopLinks = [
  { href: '/', label: 'Browse Products' },
  { href: '/buyer/services', label: 'Book Services' },
  { href: '/cart', label: 'View Cart' },
  { href: '/checkout', label: 'Secure Checkout' },
  { href: '/auth?role=vendor&next=/vendor', label: 'Sell on MyGarage' },
];

const customerCareLinks = [
  { href: '/contact-us', label: 'Contact Us' },
  { href: '/faq', label: 'Help Center' },
  { href: '/refund-policy', label: 'Returns & Refunds' },
  { href: '/order-confirmation', label: 'Order Confirmation' },
];

const accountLinks = [
  { href: '/buyer', label: 'My Account' },
  { href: '/buyer/orders', label: 'Track Orders' },
  { href: '/buyer/wishlist', label: 'Wishlist' },
  { href: '/buyer/addresses', label: 'Saved Addresses' },
];

const legalLinks = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-and-conditions', label: 'Terms & Conditions' },
  { href: '/refund-policy', label: 'Refund Policy' },
];

const paymentMethods = ['MTN MoMo', 'Airtel Money', 'Visa', 'Mastercard'] as const;

const socialLinks = [
  {
    href: 'https://www.facebook.com/',
    label: 'Facebook',
    icon: (
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    ),
  },
  {
    href: 'https://www.instagram.com/',
    label: 'Instagram',
    icon: (
      <>
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </>
    ),
  },
  {
    href: 'https://x.com/',
    label: 'X',
    icon: <path d="M4 4l6.5 8.5L4 20h2.5l5-6.5L16 20h4l-6.8-9.2L19.5 4H17l-4.6 6L8.5 4H4z" />,
  },
] as const;

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <nav aria-labelledby={`footer-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3
        id={`footer-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45"
      >
        {title}
      </h3>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={`${title}-${link.href}-${link.label}`}>
            <Link
              href={link.href}
              className="text-sm text-white/70 transition-colors duration-200 hover:text-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-12 overflow-hidden bg-[#0B1220] text-white md:mt-20">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative border-b border-white/10">
        <div className={`${containerClass} grid grid-cols-2 gap-px bg-white/10 py-0 md:grid-cols-4`}>
          {trustHighlights.map(({ icon: Icon, label, detail }) => (
            <div
              key={label}
              className="flex items-start gap-3.5 bg-[#0B1220] px-1 py-6 sm:px-4 md:py-7"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight text-white">{label}</p>
                <p className="mt-0.5 text-xs leading-5 text-white/50">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`relative ${containerClass} py-14 md:py-16`}>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
                <Image
                  src="/icon0.svg"
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              </span>
              <span className="text-xl font-bold tracking-tight">MyGarage</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/60">
              Uganda&apos;s marketplace for quality automotive parts and trusted workshop
              services — fitment-focused support, secure checkout, and dependable delivery.
            </p>

            <ul className="mt-7 space-y-3.5">
              <li>
                <a
                  href="tel:+256783676313"
                  className="inline-flex items-center gap-3 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-primary">
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  +256 783 676 313
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/256783676313"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-primary">
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  WhatsApp support
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@mygarage.ug"
                  className="inline-flex items-center gap-3 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-primary">
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  support@mygarage.ug
                </a>
              </li>
              <li className="inline-flex items-center gap-3 text-sm text-white/70">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-primary">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                </span>
                Kampala, Uganda
              </li>
              <li className="inline-flex items-start gap-3 text-sm text-white/70">
                <span className="mt-0 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-primary">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="pt-2">Mon–Sat · 8:00 AM – 6:00 PM EAT</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4 lg:gap-8">
            <FooterLinkColumn title="Shop" links={shopLinks} />
            <FooterLinkColumn title="Customer Care" links={customerCareLinks} />
            <FooterLinkColumn title="Account" links={accountLinks} />
            <FooterLinkColumn title="Legal" links={legalLinks} />
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-7 md:flex-row md:items-center md:justify-between md:py-7">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Parts specialist
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight text-white md:text-xl">
              Not sure which part fits your vehicle?
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-white/55">
              Share your make, model, and year — our team will recommend the right parts or
              book a workshop service for you.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/contact-us"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Talk to support
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/buyer/services"
              className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
            >
              Book a service
            </Link>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10 bg-black/20">
        <div
          className={`${containerClass} flex flex-col gap-5 py-5 md:flex-row md:items-center md:justify-between md:py-6`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <p className="text-xs text-white/45">
              © {currentYear} MyGarage. All rights reserved.
            </p>
            <div className="hidden h-3 w-px bg-white/15 sm:block" aria-hidden />
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {legalLinks.map((link) => (
                <li key={`bottom-${link.href}`}>
                  <Link
                    href={link.href}
                    className="text-xs text-white/45 transition-colors hover:text-white/80"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex flex-wrap items-center gap-2" aria-label="Accepted payment methods">
              {paymentMethods.map((method) => (
                <span
                  key={method}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/55"
                >
                  {method}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    {social.icon}
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
