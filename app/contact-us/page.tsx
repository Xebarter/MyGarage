import type { Metadata } from 'next';

import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { ContactMessageForm } from '@/components/contact/contact-message-form';
import { JsonLdScript } from '@/components/seo/json-ld-script';
import { buildPageMetadata, STATIC_PAGE_SEO } from '@/lib/seo/metadata';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';

export const metadata: Metadata = buildPageMetadata(STATIC_PAGE_SEO['/contact-us']);

const contactItems = [
  {
    title: 'Customer Support',
    value: 'support@mygarage.ug',
    href: 'mailto:support@mygarage.ug',
    note: 'For orders, returns, and general product questions.',
  },
  {
    title: 'Phone / WhatsApp',
    value: '+256 787 118 634',
    href: 'tel:+256787118634',
    secondary: { value: '+256 752 405 877', href: 'tel:+256752405877' },
    note: 'Available for quick updates and delivery coordination.',
  },
  {
    title: 'Data Protection Officer',
    value: 'dpo@mygarage.ug',
    href: 'mailto:dpo@mygarage.ug',
    note: 'For privacy and personal data requests.',
  },
  {
    title: 'Business Address',
    value: 'Kampala, Uganda',
    href: '#',
    note: 'Returns and in-person follow-up by prior arrangement.',
  },
];

export default function ContactUsPage() {
  return (
    <>
      <JsonLdScript
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Contact us', path: '/contact-us' },
        ])}
      />
      <Header />
      <main className="bg-background">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 mb-8 shadow-sm">
            <p className="inline-flex rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1 mb-4">
              Support
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Contact Us</h1>
            <p className="text-sm md:text-base text-muted-foreground leading-7 max-w-3xl">
              Need help with an order, return, payment issue, or product compatibility? Reach out through any of the
              channels below and our team will assist you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            {contactItems.map((item) => (
              <section key={item.title} className="rounded-xl border border-border bg-card p-5 md:p-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">{item.title}</h2>
                {item.href === '#' ? (
                  <p className="text-primary font-medium">{item.value}</p>
                ) : (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <a href={item.href} className="text-primary font-medium hover:underline">
                      {item.value}
                    </a>
                    {'secondary' in item && item.secondary ? (
                      <>
                        <span className="text-muted-foreground" aria-hidden>
                          ·
                        </span>
                        <a href={item.secondary.href} className="text-primary font-medium hover:underline">
                          {item.secondary.value}
                        </a>
                      </>
                    ) : null}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2 leading-6">{item.note}</p>
              </section>
            ))}
          </div>

          <section className="rounded-xl border border-border bg-card p-5 md:p-7 mb-8">
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">Business Hours</h2>
            <ul className="space-y-2 text-sm md:text-base text-muted-foreground leading-7">
              <li>Monday to Saturday: 8:00 AM - 6:00 PM EAT</li>
              <li>Sunday and Public Holidays: Closed (emergency support may be limited)</li>
              <li>Response target: within 2 working days</li>
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-card p-5 md:p-7">
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-2">Send a Message</h2>
            <p className="text-sm text-muted-foreground mb-4 leading-6">
              Share your details and we will follow up. For urgent help, use email or phone above.
            </p>
            <ContactMessageForm />
          </section>
        </section>
      </main>
      <Footer />
    </>
  );
}
