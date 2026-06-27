import Link from 'next/link';
import Image from 'next/image';
import {
  Clock,
  CreditCard,
  Headphones,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
} from 'lucide-react';

const trustHighlights = [
  { icon: ShieldCheck, label: 'Verified vendors' },
  { icon: CreditCard, label: 'Secure payments' },
  { icon: Truck, label: 'Fast dispatch' },
  { icon: Headphones, label: 'Support 7 days' },
] as const;

const shopLinks = [
  { href: '/', label: 'Browse Products' },
  { href: '/services', label: 'Book Services' },
  { href: '/cart', label: 'View Cart' },
  { href: '/checkout', label: 'Secure Checkout' },
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
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto grid w-full max-w-none grid-cols-2 gap-4 px-2 py-5 sm:px-2.5 md:grid-cols-4 md:px-3 md:py-6">
          {trustHighlights.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-none px-2 py-12 sm:px-2.5 md:px-3 md:py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image
                src="/icon0.svg"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
              />
              <span className="text-xl font-bold tracking-tight text-foreground">MyGarage</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Quality automotive parts and services for drivers, workshops, and fleets — with
              fitment-focused support, secure checkout, and dependable delivery across Uganda.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li>
                <a
                  href="tel:+256783676313"
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-primary"
                >
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  +256 783 676 313
                </a>
              </li>
              <li>
                <a
                  href="mailto:support@mygarage.ug"
                  className="inline-flex items-center gap-2.5 transition-colors hover:text-primary"
                >
                  <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  support@mygarage.ug
                </a>
              </li>
              <li className="inline-flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>Kampala, Uganda</span>
              </li>
              <li className="inline-flex items-start gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>Open daily · 8:00 AM – 8:00 PM EAT</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:col-span-1 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
            <FooterLinkColumn title="Shop" links={shopLinks} />
            <FooterLinkColumn title="Customer Care" links={customerCareLinks} />
            <FooterLinkColumn title="Account" links={accountLinks} />
            <FooterLinkColumn title="Legal" links={legalLinks} />
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-2 py-5 sm:px-2.5 md:flex-row md:items-center md:justify-between md:px-3">
          <p className="text-sm text-muted-foreground">
            © {currentYear} MyGarage. All rights reserved.
          </p>

          <div className="flex items-center gap-2">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
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
    </footer>
  );
}
