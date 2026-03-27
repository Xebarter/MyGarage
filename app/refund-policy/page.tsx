import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

const refundTimingRows = [
  ['Full refund (our error or confirmed defect)', '5-10 working days', 'Includes original shipping fee'],
  ['Change of mind / non-defective return', '7-14 working days', 'Original shipping fee is not refunded'],
  ['Partial refund (price reduction)', '5-10 working days', 'For minor non-conformity'],
  ['Store credit / voucher', 'Immediate', 'Optional alternative where offered'],
];

export default function RefundPolicyPage() {
  return (
    <>
      <Header />
      <main className="bg-background">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 mb-8 shadow-sm">
            <p className="inline-flex rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1 mb-4">
              Legal
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Refund Policy</h1>
            <p className="text-sm text-muted-foreground mb-1">Effective Date: April 1, 2026</p>
            <p className="text-sm text-muted-foreground mb-4">Last Updated: April 1, 2026</p>
            <p className="text-sm md:text-base text-muted-foreground leading-7 max-w-3xl">
              This policy explains when refunds, returns, exchanges, and related remedies are available for purchases
              made through MyGarage.
            </p>
          </div>

          <div className="space-y-5">
            <section className="rounded-xl border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">1. Introduction and Purpose</h2>
              <div className="space-y-3 text-sm md:text-base text-muted-foreground leading-7">
                <p>
                  MyGarage is committed to customer satisfaction. This Refund Policy explains when and how refunds,
                  returns, exchanges, or other remedies are available for purchases made on our website, mobile app, or
                  customer service channels.
                </p>
                <p>
                  This policy forms part of our Terms and Conditions and applies to all orders placed with us. By
                  placing an order, you agree to be bound by this Refund Policy.
                </p>
                <p>
                  This policy does not affect your statutory rights under the Sale of Goods and Supply of Services Act,
                  2017, or other applicable Ugandan law.
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">2. General Return and Refund Eligibility</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-7 mb-3">
                You may be eligible for a return, exchange, or refund in the following situations:
              </p>
              <h3 className="font-semibold text-foreground mb-2">A. Within the Return Window (Non-Defective / Change of Mind)</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground leading-7 mb-4">
                <li>Timeframe: within 14 calendar days from the date of delivery.</li>
                <li>Product must be unused, in original condition, with all packaging, labels, accessories, and manuals intact.</li>
                <li>No signs of installation, fitting, contamination, or use.</li>
                <li>Not custom-made, special-order, or marked Final Sale / Non-Returnable.</li>
              </ul>
              <h3 className="font-semibold text-foreground mb-2">B. Defective, Damaged, or Incorrect Item (Statutory Remedies)</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground leading-7">
                <li>Report as soon as reasonably possible after discovery (recommended within 30 days of receipt).</li>
                <li>Includes items that are not as described, not fit for purpose, damaged in delivery, or incorrectly supplied.</li>
                <li>Manufacturer defects discovered after installation may be considered subject to supporting evidence.</li>
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">3. Non-Returnable and Non-Refundable Items</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground leading-7">
                <li>Used, installed, fitted, modified, or attempted-to-fit parts.</li>
                <li>Parts with oil, grease, fluids, or contamination.</li>
                <li>Opened fluids, chemicals, coolants, brake fluids, and additives.</li>
                <li>Electrical/electronic components once packaging seals are broken.</li>
                <li>Custom-ordered or personalized parts.</li>
                <li>Products marked Final Sale, Clearance, or Non-Returnable.</li>
                <li>Software, digital downloads, ECU remaps, gift cards, or promotional credits.</li>
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">4. Return Process</h2>
              <ol className="list-decimal pl-5 space-y-2 text-sm md:text-base text-muted-foreground leading-7">
                <li>
                  Contact us within the applicable timeframe at <a href="mailto:support@mygarage.ug" className="text-primary hover:underline">support@mygarage.ug</a> or
                  via phone/WhatsApp at +256 783 676 313 with order number, photos, and reason.
                </li>
                <li>We review and respond within 2-3 working days with approval/rejection and return instructions.</li>
                <li>Pack item securely in original packaging (or equivalent) and include all accessories.</li>
                <li>Return shipping is at your cost unless the return is due to our error.</li>
                <li>After inspection (usually 3-7 working days), we approve refund/exchange or return the item if rejected.</li>
              </ol>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">5. Refund Process and Timing</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-7 mb-4">
                Approved refunds are issued to the original payment method used for purchase.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left border border-border rounded-lg overflow-hidden">
                  <thead className="bg-muted/50 text-foreground">
                    <tr>
                      <th className="px-3 py-2 border-b border-border">Type of Refund</th>
                      <th className="px-3 py-2 border-b border-border">Processing Time After Inspection</th>
                      <th className="px-3 py-2 border-b border-border">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundTimingRows.map((row) => (
                      <tr key={row[0]} className="align-top">
                        <td className="px-3 py-2 border-b border-border text-muted-foreground">{row[0]}</td>
                        <td className="px-3 py-2 border-b border-border text-muted-foreground">{row[1]}</td>
                        <td className="px-3 py-2 border-b border-border text-muted-foreground">{row[2]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground leading-7 mt-4">
                <li>Original shipping fees are refunded only when we sent a wrong or defective item.</li>
                <li>Return shipping costs are customer-paid unless the issue is our fault.</li>
                <li>Restocking/inspection fees up to 15-20% may apply to eligible change-of-mind returns.</li>
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">6. Exchanges</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground leading-7">
                <li>Follow the same return process.</li>
                <li>Replacement is shipped after return inspection and approval.</li>
                <li>Price differences and additional shipping may apply.</li>
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">7. Statutory Rights for Non-Conforming Goods</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-7 mb-3">
                Under Ugandan law, if goods do not conform to the contract, available remedies may include:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-sm md:text-base text-muted-foreground leading-7">
                <li>Repair or replacement.</li>
                <li>Price reduction.</li>
                <li>Full refund, depending on severity and timing.</li>
              </ol>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">8. Delivery Damage or Shortages</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground leading-7">
                <li>Inspect packages immediately upon receipt.</li>
                <li>Report visible damage/shortages within 48 hours with photo evidence.</li>
                <li>Report hidden defects as soon as discovered.</li>
                <li>Where carrier or seller is responsible, we may arrange collection, replacement, or refund.</li>
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">9. Cancellation Before Shipment</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground leading-7">
                <li>Orders may be cancelled before dispatch for a full refund, subject to non-recoverable payment gateway fees where applicable.</li>
                <li>After dispatch, cancellation is treated as a return under this policy.</li>
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">10. Warranty Returns</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground leading-7">
                <li>Manufacturer warranties are separate from this policy.</li>
                <li>Typical warranty periods vary by item and brand.</li>
                <li>We can help facilitate warranty claims but are not the manufacturer warrantor.</li>
              </ul>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">11. Force Majeure and Exceptions</h2>
              <p className="text-sm md:text-base text-muted-foreground leading-7">
                We are not liable for refund delays or non-performance caused by events beyond our reasonable control,
                including natural disasters, strikes, customs delays, major outages, or similar events.
              </p>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold text-foreground mb-3">12. Contact for Refund and Return Questions</h2>
              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-muted-foreground leading-7">
                <li>
                  Email: <a href="mailto:support@mygarage.ug" className="text-primary hover:underline">support@mygarage.ug</a>
                </li>
                <li>Phone/WhatsApp: +256 783 676 313</li>
                <li>Physical returns/drop-off: Kampala, Uganda</li>
                <li>Response target: within 2 working days.</li>
              </ul>
            </section>
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">
              View our{' '}
              <Link href="/terms-and-conditions" className="text-primary hover:underline">
                Terms and Conditions
              </Link>
              {' '}and{' '}
              <Link href="/privacy-policy" className="text-primary hover:underline">
                Privacy Policy
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
