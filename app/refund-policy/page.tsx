import type { Metadata } from 'next';
import Link from 'next/link';

import {
  LegalContactStrip,
  LegalContentLayout,
  LegalDocumentShell,
  LegalHero,
  LegalSection,
  type LegalSectionContent,
  legalSectionId,
} from '@/components/legal-page-layout';
import { buildPageMetadata, STATIC_PAGE_SEO } from '@/lib/seo/metadata';

export const metadata: Metadata = buildPageMetadata(STATIC_PAGE_SEO['/refund-policy']);

const refundTimingRows = [
  ['Full refund (our error or confirmed defect)', '5-10 working days', 'Includes original shipping fee'],
  ['Change of mind / non-defective return', '7-14 working days', 'Original shipping fee is not refunded'],
  ['Partial refund (price reduction)', '5-10 working days', 'For minor non-conformity'],
  ['Store credit / voucher', 'Immediate', 'Optional alternative where offered'],
];

const sections: LegalSectionContent[] = [
  {
    id: legalSectionId('1. Introduction and Purpose'),
    title: '1. Introduction and Purpose',
    body: [
      'MyGarage is committed to customer satisfaction. This Refund Policy explains when and how refunds, returns, exchanges, or other remedies are available for purchases made on our website, mobile app, or customer service channels.',
      'This policy forms part of our Terms and Conditions and applies to all orders placed with us. By placing an order, you agree to be bound by this Refund Policy.',
      'This policy does not affect your statutory rights under the Sale of Goods and Supply of Services Act, 2017, or other applicable Ugandan law.',
    ],
  },
  {
    id: legalSectionId('2. General Return and Refund Eligibility'),
    title: '2. General Return and Refund Eligibility',
    body: ['You may be eligible for a return, exchange, or refund in the following situations:'],
    subsections: [
      {
        heading: 'A. Within the Return Window (Non-Defective / Change of Mind)',
        bullets: [
          'Timeframe: within 14 calendar days from the date of delivery.',
          'Product must be unused, in original condition, with all packaging, labels, accessories, and manuals intact.',
          'No signs of installation, fitting, contamination, or use.',
          'Not custom-made, special-order, or marked Final Sale / Non-Returnable.',
        ],
      },
      {
        heading: 'B. Defective, Damaged, or Incorrect Item (Statutory Remedies)',
        bullets: [
          'Report as soon as reasonably possible after discovery (recommended within 30 days of receipt).',
          'Includes items that are not as described, not fit for purpose, damaged in delivery, or incorrectly supplied.',
          'Manufacturer defects discovered after installation may be considered subject to supporting evidence.',
        ],
      },
    ],
  },
  {
    id: legalSectionId('3. Non-Returnable and Non-Refundable Items'),
    title: '3. Non-Returnable and Non-Refundable Items',
    bullets: [
      'Used, installed, fitted, modified, or attempted-to-fit parts.',
      'Parts with oil, grease, fluids, or contamination.',
      'Opened fluids, chemicals, coolants, brake fluids, and additives.',
      'Electrical/electronic components once packaging seals are broken.',
      'Custom-ordered or personalized parts.',
      'Products marked Final Sale, Clearance, or Non-Returnable.',
      'Software, digital downloads, ECU remaps, gift cards, or promotional credits.',
    ],
  },
  {
    id: legalSectionId('4. Return Process'),
    title: '4. Return Process',
    ordered: [
      'Contact us within the applicable timeframe at support@mygarage.ug or via phone/WhatsApp at +256 783 676 313 with order number, photos, and reason.',
      'We review and respond within 2-3 working days with approval/rejection and return instructions.',
      'Pack item securely in original packaging (or equivalent) and include all accessories.',
      'Return shipping is at your cost unless the return is due to our error.',
      'After inspection (usually 3-7 working days), we approve refund/exchange or return the item if rejected.',
    ],
  },
  {
    id: legalSectionId('5. Refund Process and Timing'),
    title: '5. Refund Process and Timing',
    body: ['Approved refunds are issued to the original payment method used for purchase.'],
    table: {
      headers: ['Type of refund', 'Processing time', 'Notes'],
      rows: refundTimingRows,
    },
    bullets: [
      'Original shipping fees are refunded only when we sent a wrong or defective item.',
      'Return shipping costs are customer-paid unless the issue is our fault.',
      'Restocking/inspection fees up to 15-20% may apply to eligible change-of-mind returns.',
    ],
  },
  {
    id: legalSectionId('6. Exchanges'),
    title: '6. Exchanges',
    bullets: [
      'Follow the same return process.',
      'Replacement is shipped after return inspection and approval.',
      'Price differences and additional shipping may apply.',
    ],
  },
  {
    id: legalSectionId('7. Statutory Rights for Non-Conforming Goods'),
    title: '7. Statutory Rights for Non-Conforming Goods',
    body: ['Under Ugandan law, if goods do not conform to the contract, available remedies may include:'],
    ordered: ['Repair or replacement.', 'Price reduction.', 'Full refund, depending on severity and timing.'],
  },
  {
    id: legalSectionId('8. Delivery Damage or Shortages'),
    title: '8. Delivery Damage or Shortages',
    bullets: [
      'Inspect packages immediately upon receipt.',
      'Report visible damage/shortages within 48 hours with photo evidence.',
      'Report hidden defects as soon as discovered.',
      'Where carrier or seller is responsible, we may arrange collection, replacement, or refund.',
    ],
  },
  {
    id: legalSectionId('9. Cancellation Before Shipment'),
    title: '9. Cancellation Before Shipment',
    bullets: [
      'Orders may be cancelled before dispatch for a full refund, subject to non-recoverable payment gateway fees where applicable.',
      'After dispatch, cancellation is treated as a return under this policy.',
    ],
  },
  {
    id: legalSectionId('10. Warranty Returns'),
    title: '10. Warranty Returns',
    bullets: [
      'Manufacturer warranties are separate from this policy.',
      'Typical warranty periods vary by item and brand.',
      'We can help facilitate warranty claims but are not the manufacturer warrantor.',
    ],
  },
  {
    id: legalSectionId('11. Force Majeure and Exceptions'),
    title: '11. Force Majeure and Exceptions',
    body: [
      'We are not liable for refund delays or non-performance caused by events beyond our reasonable control, including natural disasters, strikes, customs delays, major outages, or similar events.',
    ],
  },
  {
    id: legalSectionId('12. Contact for Refund and Return Questions'),
    title: '12. Contact for Refund and Return Questions',
    bullets: [
      'Email: support@mygarage.ug',
      'Phone/WhatsApp: +256 783 676 313',
      'Physical returns/drop-off: Kampala, Uganda',
      'Response target: within 2 working days.',
    ],
  },
];

const toc = sections.map((s) => ({ id: s.id, title: s.title }));

export default function RefundPolicyPage() {
  return (
    <LegalDocumentShell>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <LegalHero
          badge="Legal"
          title="Refund Policy"
          effectiveDate="April 1, 2026"
          lastUpdated="April 1, 2026"
          activeHref="/refund-policy"
          description="When refunds, returns, exchanges, and related remedies are available for purchases made through MyGarage."
          highlights={[
            { label: 'Return window', value: '14 calendar days' },
            { label: 'Refund timing', value: '7–14 working days' },
            { label: 'Support response', value: 'Within 2 working days' },
          ]}
        />

        <details className="mt-4 rounded-xl border border-border/80 bg-card px-4 py-3 lg:hidden">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">Jump to section</summary>
          <ol className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-primary hover:underline">
                  {item.title}
                </a>
              </li>
            ))}
          </ol>
        </details>

        <LegalContentLayout sections={toc}>
          {sections.map((section) => (
            <LegalSection key={section.id} section={section} />
          ))}
        </LegalContentLayout>

        <LegalContactStrip
          extra={
            <>
              View our{' '}
              <Link href="/terms-and-conditions" className="font-medium text-primary hover:underline">
                Terms and Conditions
              </Link>{' '}
              and{' '}
              <Link href="/privacy-policy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </>
          }
        />
      </section>
    </LegalDocumentShell>
  );
}
