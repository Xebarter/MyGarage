import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

const faqSections = [
  {
    title: 'Orders and Product Fitment',
    faqs: [
      {
        question: 'How do I make sure a part fits my vehicle?',
        answer:
          'Use the product compatibility details on each listing and provide your vehicle make, model, year, and engine type at checkout. For extra confirmation, contact support with your chassis/VIN details before placing the order.',
      },
      {
        question: 'Can I cancel or change an order after placing it?',
        answer:
          'Yes, if the order has not been shipped. Contact support immediately with your order number so we can help update the part, quantity, delivery details, or cancellation request.',
      },
      {
        question: 'What if an item is out of stock after I order?',
        answer:
          'If stock changes unexpectedly, we will contact you with available options: a close alternative, a revised delivery window, partial shipment, or a refund for the affected item.',
      },
      {
        question: 'Do you sell genuine parts?',
        answer:
          'We list products based on supplier and brand information, including OEM and high-quality aftermarket options. Product pages include brand and quality details to help you choose confidently.',
      },
      {
        question: 'Can I order in bulk for a workshop or fleet?',
        answer:
          'Yes. Share your parts list and expected quantities through support, and our team will help with availability checks, pricing guidance, and coordinated delivery planning.',
      },
    ],
  },
  {
    title: 'Payments and Pricing',
    faqs: [
      {
        question: 'Which payment methods do you accept?',
        answer:
          'We support common mobile money and card-enabled checkout methods through our integrated payment partners. Available options are shown during checkout based on your location and order details.',
      },
      {
        question: 'Is online payment secure on MyGarage?',
        answer:
          'Yes. Checkout transactions are processed through secure payment partners and encrypted channels. MyGarage does not store full card details on its servers.',
      },
      {
        question: 'Can I get an invoice or receipt?',
        answer:
          'Yes. You receive order confirmation details and payment records after checkout. If you need a formal invoice for business records, contact support with your order number.',
      },
      {
        question: 'Why did my payment fail?',
        answer:
          'Payment failures can happen due to insufficient funds, network interruptions, provider timeout, or authorization limits. Please retry once and contact support if the issue continues.',
      },
      {
        question: 'Are prices inclusive of delivery fees?',
        answer:
          'Product prices are shown per item. Delivery fees are calculated separately at checkout based on delivery location, package size, and selected service option.',
      },
    ],
  },
  {
    title: 'Shipping and Delivery',
    faqs: [
      {
        question: 'Where do you deliver?',
        answer:
          'We deliver within Uganda and selected East African locations, depending on route and logistics partner coverage. Delivery availability is confirmed during checkout or by support.',
      },
      {
        question: 'How long does delivery take?',
        answer:
          'Delivery timelines vary by product availability and destination. In-stock items are usually processed quickly, while special-order items may require extra lead time.',
      },
      {
        question: 'Can I track my order?',
        answer:
          'Yes. Once your order is dispatched, we share tracking updates through your registered contact details where tracking support is available.',
      },
      {
        question: 'What happens if I miss my delivery?',
        answer:
          'If a delivery attempt fails, our team or logistics partner will contact you to arrange a second attempt or alternative delivery instructions.',
      },
      {
        question: 'Can someone else receive my order?',
        answer:
          'Yes. You can assign an authorized recipient during checkout or by contacting support before dispatch. Ensure the recipient has the correct order details for verification.',
      },
    ],
  },
  {
    title: 'Returns, Refunds, and Warranty',
    faqs: [
      {
        question: 'What is your return window?',
        answer:
          'Returns are accepted according to our Refund Policy, including conditions around product state, original packaging, and proof of purchase.',
      },
      {
        question: 'Can I return a part if I ordered the wrong one?',
        answer:
          'Yes, in many cases, if the item is unused, in original condition, and returned within the allowed period. Fitment-verified support before purchase is strongly recommended to avoid mismatches.',
      },
      {
        question: 'How do refunds work?',
        answer:
          'Once a return is approved and inspected, refunds are processed through the original payment method or approved alternative channel, based on policy terms and payment provider timelines.',
      },
      {
        question: 'Do products come with warranty?',
        answer:
          'Warranty coverage depends on the brand and item category. Eligible listings include warranty details, and claims are handled through our support process with required documentation.',
      },
      {
        question: 'What if I receive a damaged or incorrect item?',
        answer:
          'Report it as soon as possible with photos, order number, and a brief explanation. We will investigate and guide you on replacement, exchange, or refund options.',
      },
    ],
  },
  {
    title: 'Account, Privacy, and Support',
    faqs: [
      {
        question: 'Do I need an account to place an order?',
        answer:
          'You can browse freely, but creating an account helps with faster checkout, order history access, saved addresses, and easier support follow-up.',
      },
      {
        question: 'How can I reset my password?',
        answer:
          'Use the password reset flow on the login page. If you do not receive reset instructions, contact support so we can help verify and restore access.',
      },
      {
        question: 'How does MyGarage protect my personal information?',
        answer:
          'We apply security and access controls to protect personal data and process it according to our Privacy Policy and applicable legal obligations.',
      },
      {
        question: 'How do I stop receiving marketing messages?',
        answer:
          'Use the unsubscribe option in marketing communications or request opt-out through support. Service-related updates may still be sent for active orders.',
      },
      {
        question: 'How do I contact support quickly?',
        answer:
          'Reach us at support@mygarage.ug or call +256 783 676 313. Include your order number (if available) for faster assistance.',
      },
    ],
  },
  {
    title: 'For Vendors and Business Partners',
    faqs: [
      {
        question: 'How do I become a vendor on MyGarage?',
        answer:
          'Use the vendor onboarding flow and provide required business details for review. Our team verifies submissions before activating vendor access.',
      },
      {
        question: 'Can vendors manage inventory and orders online?',
        answer:
          'Yes. Approved vendors can access dashboard tools to manage products, stock visibility, and order processing workflows.',
      },
      {
        question: 'How are vendor payouts handled?',
        answer:
          'Vendor settlement timelines and payout methods follow agreed onboarding terms, accounting cycles, and reconciliation requirements.',
      },
      {
        question: 'Who do I contact for vendor support?',
        answer:
          'For vendor account or operational support, use the vendor support contacts provided during onboarding or reach out through main support for routing.',
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <Header />
      <main className="bg-background">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 mb-8 shadow-sm">
            <p className="inline-flex rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1 mb-4">
              Help Center
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Frequently Asked Questions</h1>
            <p className="text-sm md:text-base text-muted-foreground leading-7 max-w-3xl">
              Find quick answers about ordering, payments, delivery, returns, warranty, account support, and vendor
              services on MyGarage.
            </p>
          </div>

          <div className="space-y-5">
            {faqSections.map((section) => (
              <section key={section.title} className="rounded-xl border border-border bg-card p-5 md:p-7">
                <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4">{section.title}</h2>
                <div className="space-y-4">
                  {section.faqs.map((faq) => (
                    <article key={faq.question} className="rounded-lg border border-border/70 p-4 md:p-5">
                      <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{faq.question}</h3>
                      <p className="text-sm md:text-base text-muted-foreground leading-7">{faq.answer}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <p className="text-sm md:text-base text-muted-foreground leading-7">
              Still need help? Contact us at{' '}
              <a href="mailto:support@mygarage.ug" className="text-primary hover:underline">
                support@mygarage.ug
              </a>{' '}
              or call +256 783 676 313.
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              You can also review our{' '}
              <Link href="/refund-policy" className="text-primary hover:underline">
                Refund Policy
              </Link>{' '}
              and{' '}
              <Link href="/terms-and-conditions" className="text-primary hover:underline">
                Terms and Conditions
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
