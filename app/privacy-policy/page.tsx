import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

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

const sections = [
  {
    title: '1. Who We Are and How to Contact Us',
    body: [
      'MyGarage ("we", "us", or "our") is an online automotive parts store serving customers in Uganda and the East African region. We act as the data controller for personal data collected through our website, customer support channels, and delivery interactions.',
      'For privacy-related requests, contact our Data Protection Officer at dpo@mygarage.ug, support@mygarage.ug, or +256 783 676 313.',
    ],
  },
  {
    title: '2. Scope and Acceptance',
    body: [
      'This Privacy Policy applies when you browse our site, create an account, place orders, submit support requests, request returns or warranties, or subscribe to marketing communications.',
      'By using our services, you acknowledge this Policy. If you do not agree, do not use the site or provide personal data.',
    ],
  },
  {
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
    title: '4. Sources of Data',
    bullets: [
      'Directly from you during account creation, checkout, support, and communications.',
      'Automatically through cookies, analytics, logs, and security tools.',
      'From trusted partners such as payment providers, logistics partners, and fraud-prevention services.',
    ],
  },
  {
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
    title: '7. Sharing and Disclosure',
    body: [
      'We share personal data only when necessary with service providers such as payment processors, delivery partners, cloud infrastructure providers, analytics providers (with consent where required), and legal/regulatory authorities when required by law.',
      'We do not sell your personal data.',
    ],
  },
  {
    title: '8. International Data Transfers',
    body: [
      'Some providers may process data outside Uganda. Where this occurs, we implement safeguards such as contractual protections and other lawful transfer mechanisms required by applicable data protection law.',
    ],
  },
  {
    title: '9. Data Security Measures',
    bullets: [
      'Encryption in transit and at rest for sensitive data.',
      'Role-based access controls and strong authentication controls.',
      'Monitoring, logging, vulnerability checks, and incident response processes.',
      'Staff confidentiality obligations and data-protection training.',
    ],
  },
  {
    title: '10. Data Retention',
    body: [
      'We retain personal data only for as long as necessary for the purposes in this Policy, including order fulfillment, legal compliance, dispute resolution, and fraud prevention.',
      'When retention is no longer necessary, data is securely deleted or irreversibly anonymized.',
    ],
  },
  {
    title: '11. Your Data Rights',
    bullets: [
      'Right of access to your personal data.',
      'Right to correct inaccurate or incomplete data.',
      'Right to request deletion where legally applicable.',
      'Right to restrict or object to processing in specific circumstances.',
      'Right to withdraw consent at any time for consent-based processing.',
      'Right to data portability where applicable.',
    ],
  },
  {
    title: '12. Automated Decision-Making',
    body: [
      'We do not currently use automated decision-making that produces legal or similarly significant effects without human review.',
    ],
  },
  {
    title: '13. Cookies and Tracking Technologies',
    bullets: [
      'Essential cookies for authentication, security, and cart/session functionality.',
      'Analytics cookies to understand and improve site performance.',
      'Advertising/retargeting technologies where consent is provided.',
      'You can manage cookie settings through browser controls and cookie preferences.',
    ],
  },
  {
    title: '14. Children and Minors',
    body: [
      'Our services are not directed to children under 18. We do not knowingly collect personal data from minors without valid guardian authorization. If discovered, such data will be removed as appropriate.',
    ],
  },
  {
    title: '15. Data Breach Notification',
    body: [
      'If a personal data breach is likely to result in high risk to your rights and freedoms, we will notify relevant authorities and affected individuals in accordance with legal requirements.',
    ],
  },
  {
    title: '16. Changes to This Privacy Policy',
    body: [
      'We may update this Policy from time to time. Material changes will be communicated through site notices, email, and updated effective dates where appropriate.',
      'Continued use of our services after updates constitutes acceptance of the revised Policy.',
    ],
  },
  {
    title: '17. Complaints',
    body: [
      'If you have a privacy complaint, contact our Data Protection Officer first at dpo@mygarage.ug. If unresolved, you may escalate to the Personal Data Protection Office (PDPO) in Uganda.',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <Header />
      <main className="bg-background">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 mb-8 shadow-sm">
            <p className="inline-flex rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1 mb-4">
              Legal
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mb-1">Effective Date: April 1, 2026</p>
            <p className="text-sm text-muted-foreground mb-4">Last Updated: April 1, 2026</p>
            <p className="text-sm md:text-base text-muted-foreground leading-7 max-w-3xl">
              This policy explains how MyGarage collects, uses, shares, protects, and retains personal data when you
              use our website and related services.
            </p>
          </div>

          <div className="space-y-5">
            {sections.map((section) => (
              <section key={section.title} className="rounded-xl border border-border bg-card p-5 md:p-7">
                <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">{section.title}</h2>

                {section.body ? (
                  <div className="space-y-3">
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="text-sm md:text-base text-muted-foreground leading-7">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : null}

                {section.bullets ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="text-sm md:text-base text-muted-foreground leading-7">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {section.title === '7. Sharing and Disclosure' ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm text-left border border-border rounded-lg overflow-hidden">
                      <thead className="bg-muted/50 text-foreground">
                        <tr>
                          <th className="px-3 py-2 border-b border-border">Recipient</th>
                          <th className="px-3 py-2 border-b border-border">Purpose</th>
                          <th className="px-3 py-2 border-b border-border">Safeguards</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sharingRows.map((row) => (
                          <tr key={row[0]} className="align-top">
                            <td className="px-3 py-2 border-b border-border text-muted-foreground">{row[0]}</td>
                            <td className="px-3 py-2 border-b border-border text-muted-foreground">{row[1]}</td>
                            <td className="px-3 py-2 border-b border-border text-muted-foreground">{row[2]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {section.title === '10. Data Retention' ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm text-left border border-border rounded-lg overflow-hidden">
                      <thead className="bg-muted/50 text-foreground">
                        <tr>
                          <th className="px-3 py-2 border-b border-border">Data Type</th>
                          <th className="px-3 py-2 border-b border-border">Retention Period</th>
                          <th className="px-3 py-2 border-b border-border">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retentionRows.map((row) => (
                          <tr key={row[0]} className="align-top">
                            <td className="px-3 py-2 border-b border-border text-muted-foreground">{row[0]}</td>
                            <td className="px-3 py-2 border-b border-border text-muted-foreground">{row[1]}</td>
                            <td className="px-3 py-2 border-b border-border text-muted-foreground">{row[2]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {section.title === '11. Your Data Rights' ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-sm text-left border border-border rounded-lg overflow-hidden">
                      <thead className="bg-muted/50 text-foreground">
                        <tr>
                          <th className="px-3 py-2 border-b border-border">Right</th>
                          <th className="px-3 py-2 border-b border-border">Description</th>
                          <th className="px-3 py-2 border-b border-border">How to Exercise</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rightsRows.map((row) => (
                          <tr key={row[0]} className="align-top">
                            <td className="px-3 py-2 border-b border-border text-muted-foreground">{row[0]}</td>
                            <td className="px-3 py-2 border-b border-border text-muted-foreground">{row[1]}</td>
                            <td className="px-3 py-2 border-b border-border text-muted-foreground">{row[2]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-3 text-sm text-muted-foreground">
                      We respond to valid rights requests within 30 calendar days, extendable for complex requests
                      where permitted by law.
                    </p>
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <p className="text-sm md:text-base text-muted-foreground leading-7">
              Privacy contact: {' '}
              <a href="mailto:dpo@mygarage.ug" className="text-primary hover:underline">
                dpo@mygarage.ug
              </a>
              . General support:{' '}
              <a href="mailto:support@mygarage.ug" className="text-primary hover:underline">
                support@mygarage.ug
              </a>
              {' '}or phone: +256 783 676 313.
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              View our{' '}
              <Link href="/terms-and-conditions" className="text-primary hover:underline">
                Terms and Conditions
              </Link>
              {' '}or return to{' '}
              <Link href="/" className="text-primary hover:underline">
                Home
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
