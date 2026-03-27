import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

const sections = [
  {
    title: '1. Introduction',
    body: [
      'Welcome to MyGarage ("we", "us", or "our"), an online platform specializing in the sale of genuine, aftermarket, refurbished, used, and performance car parts, accessories, fluids, and related products, primarily serving customers in Uganda and the East African region.',
      'These Terms and Conditions govern your access to and use of our website, account services, order placement, payment processing, shipping, delivery, and related support services.',
      'By accessing this site, creating an account, or placing an order, you agree to be bound by these Terms in full. If you do not agree with any part of these Terms, you must not use the site or services.',
      'These Terms form a legally binding contract between you and MyGarage. We recommend you save or print a copy for your records.',
    ],
  },
  {
    title: '2. Definitions',
    bullets: [
      '"Account" means the unique user profile you create on the site to access certain features and place orders.',
      '"Customer" or "You" means any individual or business entity using the site or placing an order.',
      '"Order" means your request to purchase products from us through the site.',
      '"Products" means all parts, accessories, fluids, tools, and related goods listed on the site.',
      '"Site" means the MyGarage website and related web pages.',
      '"Working Days" means Monday to Friday excluding public holidays in Uganda.',
    ],
  },
  {
    title: '3. Eligibility',
    bullets: [
      'You must be at least 18 years old and legally capable of entering a binding contract. If you are under 18, you may only use the site under supervision of a parent or legal guardian.',
      'You must provide accurate, current, and complete information during registration, checkout, and customer support interactions.',
      'You must not be prohibited from using the site under applicable laws or restrictions.',
      'Use of the site must be for lawful personal or legitimate business purposes only.',
      'Unauthorized bulk buying or resale activity may result in account suspension or order cancellation.',
      'We reserve the right to refuse service, terminate accounts, or cancel orders if eligibility requirements are not met.',
    ],
  },
  {
    title: '4. Account Registration and Security',
    bullets: [
      'Certain features including address book, order history, and faster checkout require account registration.',
      'You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.',
      'Do not share your credentials with others. Use strong passwords and sign out on shared devices.',
      'Notify us immediately at support@mygarage.ug if you suspect unauthorized access or account misuse.',
      'We may suspend or terminate accounts without prior notice where fraud, abuse, illegal activity, or security risk is suspected.',
      'You may close your account at any time, but outstanding orders or payment obligations remain your responsibility.',
    ],
  },
  {
    title: '5. Products and Product Information',
    body: [
      'We make reasonable efforts to ensure that product descriptions, specifications, compatibility notes, part numbers, fitment guidance, and images are accurate and up to date. However, due to supplier updates, model-year differences, and vehicle modifications, some details may vary.',
      'Product images and colors may differ from actual products because of lighting, screen settings, and manufacturer changes.',
      'Products may include OEM, aftermarket, refurbished, used, and performance parts. Product type is displayed where available.',
      'You are responsible for independently confirming compatibility before purchase, including by verifying part numbers or consulting a qualified mechanic.',
      'Availability is subject to stock. If an item is unavailable after order placement, we may offer alternatives, partial fulfillment, cancellation, or refund.',
    ],
  },
  {
    title: '6. Pricing and Payment',
    bullets: [
      'All prices are displayed in Uganda Shillings (UGX) unless otherwise stated.',
      'Prices shown at checkout may include taxes where applicable, while shipping, handling, and other fees are shown separately.',
      'Prices may change without notice before order confirmation due to supplier changes, tax changes, or exchange-rate movements.',
      'We make reasonable efforts to avoid pricing errors. If an obvious pricing error occurs, we may cancel the order or request confirmation at the correct price.',
      'Payment is due in full at checkout unless otherwise agreed in writing.',
      'Accepted methods include Mobile Money, Visa/Mastercard, bank transfer, and cash on delivery where available.',
      'If payment fails, is declined, or is reversed, we may cancel the order and recover associated costs.',
      'Title to products remains with MyGarage until full payment clears.',
    ],
  },
  {
    title: '7. Orders and Order Acceptance',
    body: [
      'When you place an order, it is an offer to purchase products at the listed terms. An automated receipt confirmation only acknowledges submission and does not constitute acceptance.',
      'A binding contract is formed when we issue an order acceptance/confirmation notice or dispatch the products, whichever occurs first.',
      'We may refuse, hold, or cancel orders due to unavailability, pricing errors, suspected fraud, payment verification issues, legal restrictions, or breach of these Terms.',
      'You may request cancellation or modification before processing begins. Once processed, changes are handled at our discretion.',
      'Before final submission, you are responsible for reviewing order details and correcting any mistakes.',
    ],
  },
  {
    title: '8. Shipping, Delivery, and Risk',
    bullets: [
      'We deliver within Uganda and selected cross-border destinations when available.',
      'Delivery times are estimates only and may be affected by weather, logistics constraints, traffic, customs, holidays, power outages, or other external events.',
      'Risk of loss or damage passes to you upon delivery to the shipping carrier for shipped orders, or upon handover for pickup or cash-on-delivery orders.',
      'Inspect products on delivery and report visible damage, shortages, or incorrect items within 48 hours.',
      'For hidden defects, notify us as soon as reasonably possible after discovery.',
      'Failed delivery due to incorrect address, unreachable recipient, or repeated missed handover may attract redelivery fees.',
      'Force majeure events may delay performance without liability where legally permitted.',
    ],
  },
  {
    title: '9. Returns, Refunds, and Exchanges',
    bullets: [
      'Return requests must be submitted within 14 days of receipt unless a shorter or longer period is stated on the product page.',
      'Returned products must be unused, uninstalled, unmodified, and in original condition with original packaging, labels, and included accessories.',
      'Common non-returnable items include custom-ordered parts, opened fluids/chemicals, certain electrical/electronic components, and products marked non-returnable or final sale.',
      'To start a return, contact support@mygarage.ug with order number, reason for return, and clear product photos.',
      'Approved returns receive a return authorization. Unauthorized returns may be rejected.',
      'Return shipping costs are paid by the customer unless the return results from our error (wrong item, damaged on arrival, or confirmed defect).',
      'Approved refunds are processed to the original payment method within 7 to 14 working days after inspection.',
      'Original shipping charges and restocking fees may apply for non-fault returns where legally permitted.',
      'Nothing in this section removes your mandatory statutory consumer rights.',
    ],
  },
  {
    title: '10. Warranties and Disclaimers',
    body: [
      'At delivery, products are expected to match the listed description and be sold with legal right of sale by MyGarage.',
      'Manufacturer warranties, where provided, are subject to each manufacturer policy and claims process.',
      'Except as required by law, we do not provide additional warranties on fitment for every vehicle variant, modified-vehicle compatibility, or outcomes from improper installation.',
      'Used and refurbished products may be sold on a limited-warranty or as-is basis as disclosed on the product page.',
      'Professional installation is strongly recommended. Damage caused by incorrect installation, misuse, neglect, accident, or unauthorized modification is not covered.',
    ],
  },
  {
    title: '11. Limitation of Liability',
    body: [
      'To the fullest extent permitted by law, our total liability for claims connected to any product or order is limited to the amount paid for that product.',
      'We are not liable for indirect or consequential losses including loss of profit, loss of revenue, downtime, towing costs, replacement labor, or business interruption.',
      'We are not responsible for losses caused by failure to verify compatibility, improper installation, normal wear and tear, or third-party service failures.',
      'Nothing in these Terms excludes liability that cannot be excluded by law, including liability for fraud and other mandatory protections.',
    ],
  },
  {
    title: '12. Indemnification',
    body: [
      'You agree to indemnify, defend, and hold harmless MyGarage, its owners, employees, and affiliates against claims, losses, liabilities, and expenses arising from your breach of these Terms, misuse of products, unlawful conduct, or violation of third-party rights.',
      'This indemnity survives account closure and termination of your use of the site.',
    ],
  },
  {
    title: '13. Intellectual Property',
    body: [
      'All text, product data, images, logos, graphics, videos, software, page layouts, and related content on this site are owned by MyGarage or its licensors and are protected by applicable intellectual property laws.',
      'You are granted a limited, revocable, non-transferable license to access and use the site for personal shopping and legitimate business purchasing only.',
      'Without prior written permission, you may not copy, scrape, reproduce, republish, distribute, sell, or create derivative works from site content.',
      'Unauthorized use may result in legal action and applicable civil or criminal penalties.',
    ],
  },
  {
    title: '14. Acceptable Use',
    bullets: [
      'Do not use the site for illegal, fraudulent, abusive, or harmful activities.',
      'Do not impersonate any person or entity, or submit false registration or payment details.',
      'Do not upload malware, attempt unauthorized access, disrupt systems, or bypass security.',
      'Do not use bots, scrapers, scripts, or automation to extract data or place bulk orders without authorization.',
      'Do not harass, threaten, or abuse our staff, customers, or business partners.',
      'We may investigate violations and take action including account suspension, order cancellation, and legal reporting.',
    ],
  },
  {
    title: '15. Third-Party Links and Services',
    body: [
      'The site may link to or integrate with third-party services such as payment gateways, logistics providers, social platforms, and manufacturer websites.',
      'These third-party services operate under their own terms and privacy policies.',
      'MyGarage does not control and is not responsible for third-party content, availability, service quality, or security practices.',
      'Any interaction with third-party platforms is at your own risk.',
    ],
  },
  {
    title: '16. Privacy and Data Protection',
    body: [
      'Our collection and use of personal data are governed by our Privacy Policy and applicable data protection laws.',
      'By using the site, you consent to processing of relevant personal data for account administration, order fulfillment, payment processing, delivery coordination, support, fraud prevention, and legal compliance.',
      'We implement reasonable technical and organizational safeguards to protect personal data.',
      'You may request access, correction, or deletion of personal data in accordance with applicable law by contacting dpo@mygarage.ug.',
    ],
  },
  {
    title: '17. Force Majeure',
    body: [
      'We are not liable for delay or non-performance caused by events outside reasonable control, including natural disasters, acts of government, civil unrest, strikes, supply shortages, customs delays, power outages, internet disruptions, epidemics, and similar events.',
      'Where such events occur, we will use reasonable efforts to minimize impact and resume normal operations.',
    ],
  },
  {
    title: '18. Termination and Suspension',
    body: [
      'We may suspend accounts, restrict access, or cancel orders where there is breach of these Terms, non-payment, fraud risk, abuse, legal violations, or security threats.',
      'You may close your account at any time by contacting support, but unpaid balances and unresolved orders remain enforceable.',
      'Termination does not affect rights and obligations that by nature survive, including payment obligations, liability limits, and indemnities.',
    ],
  },
  {
    title: '19. Governing Law and Jurisdiction',
    body: [
      'These Terms and all disputes related to the site, products, and services are governed by the laws of the Republic of Uganda.',
      'Subject to applicable dispute resolution mechanisms, courts located in Kampala, Uganda have jurisdiction over related claims.',
    ],
  },
  {
    title: '20. Dispute Resolution and Arbitration',
    body: [
      'Parties agree to first attempt good-faith negotiation to resolve disputes.',
      'If unresolved within 30 days, disputes may be referred to mediation or arbitration in Kampala, Uganda in accordance with applicable arbitration law.',
      'Either party may seek urgent injunctive relief from a competent court where necessary to prevent immediate harm.',
    ],
  },
  {
    title: '21. Changes to These Terms',
    body: [
      'We may revise these Terms from time to time.',
      'When material updates are made, we will publish the updated Terms with a revised "Last Updated" date and may provide additional notice through email or site notification.',
      'Your continued use of the site after the effective date of updated Terms constitutes acceptance of those changes.',
    ],
  },
  {
    title: '22. Severability',
    body: [
      'If any provision is held invalid, illegal, or unenforceable, that provision will be limited or removed to the minimum extent necessary and the remaining provisions remain fully enforceable.',
    ],
  },
  {
    title: '23. Entire Agreement',
    body: [
      'These Terms, together with incorporated policies and confirmed order documents, form the entire agreement between you and MyGarage for your use of the site and services.',
      'They replace prior understandings, communications, or agreements on the same subject matter unless explicitly agreed in writing.',
    ],
  },
  {
    title: '24. Contact Information',
    bullets: [
      'Company: MyGarage',
      'Email: support@mygarage.ug',
      'Phone: +256 783 676 313',
      'Address: Kampala, Uganda',
      'Business Hours: Monday to Saturday, 8:00 AM to 6:00 PM EAT',
      'Data Protection Contact: dpo@mygarage.ug',
    ],
  },
  {
    title: '25. Miscellaneous',
    bullets: [
      'Our failure to enforce any right does not waive that right.',
      'We may assign our rights and obligations under these Terms.',
      'You may not assign your rights without our prior written consent.',
      'Any notice under these Terms may be delivered by email, site notice, or other written method we designate.',
      'Section headings are for convenience only and do not affect legal interpretation.',
      'Clauses intended to survive termination remain enforceable.',
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <>
      <Header />
      <main className="bg-background">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 mb-8 shadow-sm">
            <p className="inline-flex rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1 mb-4">
              Legal
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Terms and Conditions</h1>
            <p className="text-sm text-muted-foreground mb-4">Last Updated: March 23, 2026</p>
            <p className="text-sm md:text-base text-muted-foreground leading-7 max-w-3xl">
              These Terms govern your use of MyGarage, including browsing, account use, purchases, payments, shipping,
              and related services. Please read them carefully before placing an order.
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
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <p className="text-sm md:text-base text-muted-foreground leading-7">
              For support about these Terms, contact{' '}
              <a href="mailto:support@mygarage.ug" className="text-primary hover:underline">
                support@mygarage.ug
              </a>
              . For data privacy requests, contact{' '}
              <a href="mailto:dpo@mygarage.ug" className="text-primary hover:underline">
                dpo@mygarage.ug
              </a>
              .
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              Read our{' '}
              <Link href="/refund-policy" className="text-primary hover:underline">
                Refund Policy
              </Link>
              {' '}for detailed return, exchange, and refund procedures.
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              Return to{' '}
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
