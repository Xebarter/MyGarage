import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const quickLinks = [
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
    { href: '/terms-and-conditions', label: 'Terms and Conditions' },
    { href: '/refund-policy', label: 'Refund Policy' },
  ];

  return (
    <footer className="mt-16 border-t border-border bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <p className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              MyGarage
            </p>
            <h3 className="mt-4 text-xl font-bold text-foreground">Quality automotive parts and services, delivered reliably.</h3>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              MyGarage helps drivers, workshops, and fleets find trusted parts faster with fitment-focused support,
              secure checkout, and dependable delivery.
            </p>
            <div className="mt-5 grid max-w-md grid-cols-2 gap-3 text-xs text-muted-foreground">
              <p className="rounded-md border border-border bg-background/70 px-3 py-2">Verified vendors</p>
              <p className="rounded-md border border-border bg-background/70 px-3 py-2">Secure payments</p>
              <p className="rounded-md border border-border bg-background/70 px-3 py-2">Fast dispatch</p>
              <p className="rounded-md border border-border bg-background/70 px-3 py-2">Support 7 days</p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <a href="tel:+256783676313" className="rounded-md border border-border px-3 py-1.5 hover:bg-accent hover:text-accent-foreground">
                +256 783 676 313
              </a>
              <a href="mailto:support@mygarage.ug" className="rounded-md border border-border px-3 py-1.5 hover:bg-accent hover:text-accent-foreground">
                support@mygarage.ug
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">Shop</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">Customer Care</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {customerCareLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">Account</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">Legal</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row md:items-center">
          <div className="space-y-1">
            <p>© {currentYear} MyGarage. All rights reserved.</p>
            <p className="text-xs">Open daily: 8:00 AM - 8:00 PM EAT | Kampala, Uganda</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-foreground"
            >
              Facebook
            </a>
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-foreground"
            >
              Instagram
            </a>
            <a
              href="https://x.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-foreground"
            >
              X (Twitter)
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
