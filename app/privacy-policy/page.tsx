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

export const metadata: Metadata = buildPageMetadata(STATIC_PAGE_SEO['/privacy-policy']);

const sharingRows = [
  ['Payment processors (Pesapal, DPO, Flutterwave)', 'Secure payment processing', 'Contractual obligations and PCI-DSS aligned controls'],
  ['Delivery and logistics partners', 'Delivery, tracking, and proof of delivery', 'Data processing agreements'],
  ['IT and cloud providers', 'Hosting, backups, and platform operations', 'DPA terms and restricted access controls'],
  ['Marketing and analytics providers', 'Usage insights and campaign performance', 'Consent controls and anonymization where possible'],
  ['Law enforcement and regulators', 'Legal compliance and investigations', 'Disclosed only when legally required'],
  ['Business successors', 'Mergers, acquisitions, or asset transfers', 'Continued protection and notice obligations'],
];

const retentionRows = [
  ['Active account and order history', 'Duration of account + 7 years after closure', 'Tax, warranty, and consumer-claim compliance'],
  ['Marketing consent records', 'Until withdrawal + 1 year', 'Proof of consent'],
  ['Analytics and system logs', '24 months', 'Security and service improvement'],
  ['Payment transaction metadata', '7 years', 'Financial and audit requirements'],
  ['Fraud investigation records', 'While investigation is active and any legal follow-up period', 'Security and legal defense'],
];

const rightsRows = [
  ['Right of access', 'Obtain a copy of your personal data and confirmation of processing.', 'Email dpo@mygarage.ug'],
  ['Right to rectification', 'Correct inaccurate or incomplete data.', 'Update account profile or email dpo@mygarage.ug'],
  ['Right to erasure', 'Request deletion where data is no longer necessary or consent is withdrawn (subject to legal exceptions).', 'Email dpo@mygarage.ug'],
  ['Right to restrict processing', 'Limit processing in specific legally permitted situations.', 'Email dpo@mygarage.ug'],
  ['Right to object', 'Object to processing based on legitimate interests or direct marketing.', 'Use unsubscribe link or email dpo@mygarage.ug'],
  ['Right to withdraw consent', 'Withdraw consent at any time for consent-based processing.', 'Use unsubscribe link or email dpo@mygarage.ug'],
  ['Right to data portability', 'Receive eligible personal data in a structured, machine-readable format.', 'Email dpo@mygarage.ug'],
];

const sections: LegalSectionContent[] = [
  {
    id: legalSectionId('1. Who We Are and How to Contact Us'),
    title: '1. Who We Are and How to Contact Us',
    body: [
      'MyGarage ("we", "us", or "our") is an online automotive parts store serving customers in Uganda and the East African region. We act as the data controller for personal data collected through our website, customer support channels, and delivery interactions.',
      'For privacy-related requests, contact our Data Protection Officer at dpo@mygarage.ug, support@mygarage.ug, or +256 783 676 313.',
    ],
  },
  {
    id: legalSectionId('2. Scope and Acceptance'),
    title: '2. Scope and Acceptance',
    body: [
      'This Privacy Policy applies when you browse our site, create an account, place orders, submit support requests, request returns or warranties, or subscribe to marketing communications.',
      'By using our services, you acknowledge this Policy. If you do not agree, do not use the site or provide personal data.',
    ],
  },
  {
    id: legalSectionId('3. Personal Data We Collect'),
    title: '3. Personal Data We Collect',
    bullets: [
      'Identity data: name, optional gender/date of birth, and identity details where required for verification.',
      'Contact data: phone number, email, WhatsApp contact where used for order updates.',
      'Delivery data: address, district, landmarks, and optional location coordinates for delivery support.',
      'Vehicle data: make, model, year, engine type, and partial VIN/chassis for compatibility checks.',
      'Payment data: payment references and limited account details for refunds.',
      'Account data: encrypted password, saved addresses, wishlist, notification preferences.',
      'Communications: messages, support tickets, call records (with notice), and images shared for returns/fitment.',
      'Technical and usage data: IP, browser/device details, pages visited, cart events, session/cookie identifiers.',
    ],
  },
  {
    id: legalSectionId('4. Sources of Data'),
    title: '4. Sources of Data',
    bullets: [
      'Directly from you during account creation, checkout, support, and communications.',
      'Automatically through cookies, analytics, logs, and security tools.',
      'From trusted partners such as payment providers, logistics partners, and fraud-prevention services.',
    ],
  },
  {
    id: legalSectionId('5. Legal Bases for Processing'),
    title: '5. Legal Bases for Processing',
    bullets: [
      'Consent (for marketing, non-essential cookies, optional location sharing).',
      'Contract performance (processing and fulfilling orders, refunds, and support).',
      'Legal obligations (record retention, tax and regulatory compliance).',
      'Legitimate interests (fraud prevention, platform security, service improvement).',
      'Vital interests in rare emergency circumstances.',
    ],
  },
  {
    id: legalSectionId('6. How We Use Personal Data'),
    title: '6. How We Use Personal Data',
    bullets: [
      'Create and manage accounts.',
      'Process, confirm, ship, and deliver orders.',
      'Verify part compatibility and reduce fitment errors.',
      'Handle payments, returns, exchanges, and warranty requests.',
      'Provide customer support and service updates.',
      'Detect and prevent fraud, abuse, and cyber threats.',
      'Improve user experience, product planning, and internal analytics.',
      'Send marketing messages where you have opted in.',
    ],
  },
  {
    id: legalSectionId('7. Sharing and Disclosure'),
    title: '7. Sharing and Disclosure',
    body: [
      'We share personal data only when necessary with service providers such as payment processors, delivery partners, cloud infrastructure providers, analytics providers (with consent where required), and legal/regulatory authorities when required by law.',
      'We do not sell your personal data.',
    ],
    table: {
      headers: ['Recipient', 'Purpose', 'Safeguards'],
      rows: sharingRows,
    },
  },
  {
    id: legalSectionId('8. International Data Transfers'),
    title: '8. International Data Transfers',
    body: [
      'Some providers may process data outside Uganda. Where this occurs, we implement safeguards such as contractual protections and other lawful transfer mechanisms required by applicable data protection law.',
    ],
  },
  {
    id: legalSectionId('9. Data Security Measures'),
    title: '9. Data Security Measures',
    bullets: [
      'Encryption in transit and at rest for sensitive data.',
      'Role-based access controls and strong authentication controls.',
      'Monitoring, logging, vulnerability checks, and incident response processes.',
      'Staff confidentiality obligations and data-protection training.',
    ],
  },
  {
    id: legalSectionId('10. Data Retention'),
    title: '10. Data Retention',
    body: [
      'We retain personal data only for as long as necessary for the purposes in this Policy, including order fulfillment, legal compliance, dispute resolution, and fraud prevention.',
      'When retention is no longer necessary, data is securely deleted or irreversibly anonymized.',
    ],
    table: {
      headers: ['Data type', 'Retention period', 'Reason'],
      rows: retentionRows,
    },
  },
  {
    id: legalSectionId('11. Your Data Rights'),
    title: '11. Your Data Rights',
    bullets: [
      'Right of access to your personal data.',
      'Right to correct inaccurate or incomplete data.',
      'Right to request deletion where legally applicable.',
      'Right to restrict or object to processing in specific circumstances.',
      'Right to withdraw consent at any time for consent-based processing.',
      'Right to data portability where applicable.',
    ],
    table: {
      headers: ['Right', 'Description', 'How to exercise'],
      rows: rightsRows,
    },
    footerNote:
      'We respond to valid rights requests within 30 calendar days, extendable for complex requests where permitted by law.',
  },
  {
    id: legalSectionId('12. Automated Decision-Making'),
    title: '12. Automated Decision-Making',
    body: [
      'We do not currently use automated decision-making that produces legal or similarly significant effects without human review.',
    ],
  },
  {
    id: legalSectionId('13. Cookies and Tracking Technologies'),
    title: '13. Cookies and Tracking Technologies',
    bullets: [
      'Essential cookies for authentication, security, and cart/session functionality.',
      'Analytics cookies to understand and improve site performance.',
      'Advertising/retargeting technologies where consent is provided.',
      'You can manage cookie settings through browser controls and cookie preferences.',
    ],
  },
  {
    id: legalSectionId('14. Children and Minors'),
    title: '14. Children and Minors',
    body: [
      'Our services are not directed to children under 18. We do not knowingly collect personal data from minors without valid guardian authorization. If discovered, such data will be removed as appropriate.',
    ],
  },
  {
    id: legalSectionId('15. Data Breach Notification'),
    title: '15. Data Breach Notification',
    body: [
      'If a personal data breach is likely to result in high risk to your rights and freedoms, we will notify relevant authorities and affected individuals in accordance with legal requirements.',
    ],
  },
  {
    id: legalSectionId('16. Changes to This Privacy Policy'),
    title: '16. Changes to This Privacy Policy',
    body: [
      'We may update this Policy from time to time. Material changes will be communicated through site notices, email, and updated effective dates where appropriate.',
      'Continued use of our services after updates constitutes acceptance of the revised Policy.',
    ],
  },
  {
    id: legalSectionId('17. Complaints'),
    title: '17. Complaints',
    body: [
      'If you have a privacy complaint, contact our Data Protection Officer first at dpo@mygarage.ug. If unresolved, you may escalate to the Personal Data Protection Office (PDPO) in Uganda.',
    ],
  },
];

const toc = sections.map((s) => ({ id: s.id, title: s.title }));

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentShell>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
        <LegalHero
          badge="Legal"
          title="Privacy Policy"
          effectiveDate="April 1, 2026"
          lastUpdated="April 1, 2026"
          activeHref="/privacy-policy"
          description="How MyGarage collects, uses, shares, protects, and retains personal data when you use our website and related services."
          highlights={[
            { label: 'Data controller', value: 'MyGarage' },
            { label: 'Privacy contact', value: 'dpo@mygarage.ug' },
            { label: 'Rights response', value: 'Within 30 days' },
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
              Read our{' '}
              <Link href="/terms-and-conditions" className="font-medium text-primary hover:underline">
                Terms and Conditions
              </Link>
              .
            </>
          }
        />
      </section>
    </LegalDocumentShell>
  );
}
