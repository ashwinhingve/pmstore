import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { CONTACT } from "@/lib/constants"
import { Truck, MapPin, Clock, Package, Phone, Mail, IndianRupee, AlertCircle } from "lucide-react"

export default function ShippingPolicyPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[var(--paper)] py-20 md:py-32">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-[var(--brand)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-10 h-10 text-[var(--brand-ink)]" />
            </div>
            <h1 className="text-[length:var(--step-3)] mb-6 text-[var(--ink)]">
              Shipping Policy
            </h1>
            <p className="text-xl md:text-2xl text-[var(--ink-70)] mb-4">
              Fast, reliable delivery across India
            </p>
            <p className="text-base text-[var(--ink-40)]">
              Last Updated: February 2026
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-[var(--paper-card)]">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-12">
            {/* Delivery Coverage */}
            <AnimatedSection direction="up">
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 border border-[var(--foil-soft)] shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-6 h-6 text-[var(--brand)]" />
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Delivery Coverage</h2>
                </div>
                <ul className="space-y-3 text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">-</span>
                    We deliver across India through our logistics partner <strong>Delhivery</strong>.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">-</span>
                    Delivery availability is based on PIN code serviceability. Check during checkout.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">-</span>
                    We currently do not ship internationally.
                  </li>
                </ul>
              </div>
            </AnimatedSection>

            {/* Delivery Timeline */}
            <AnimatedSection direction="up">
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 border border-[var(--foil-soft)] shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-[var(--brand)]" />
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Estimated Delivery Time</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-[var(--brand-soft)] rounded-[var(--radius-md)] p-5 border border-[var(--brand)]">
                    <h3 className="font-semibold font-display text-[var(--brand)] mb-2">Metro Cities</h3>
                    <p className="text-3xl font-bold text-[var(--ink)]">3-5</p>
                    <p className="text-sm text-[var(--ink-70)]">business days</p>
                  </div>
                  <div className="bg-[var(--brand-soft)] rounded-[var(--radius-md)] p-5 border border-[var(--brand)]">
                    <h3 className="font-semibold font-display text-[var(--brand)] mb-2">Other Locations</h3>
                    <p className="text-3xl font-bold text-[var(--ink)]">5-7</p>
                    <p className="text-sm text-[var(--ink-70)]">business days</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--ink-40)] mt-4">
                  Times are estimates and may vary by location, weather, and holidays. Orders after 2 PM IST process next business day.
                </p>
              </div>
            </AnimatedSection>

            {/* Shipping Charges */}
            <AnimatedSection direction="up">
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 border border-[var(--foil-soft)] shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-3 mb-4">
                  <IndianRupee className="w-6 h-6 text-[var(--brand)]" />
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Shipping Charges</h2>
                </div>
                <ul className="space-y-3 text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">-</span>
                    Charges calculated at checkout based on weight and destination.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">-</span>
                    <strong>Free shipping</strong> on orders above the minimum (shown at checkout).
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">-</span>
                    All prices include applicable taxes.
                  </li>
                </ul>
              </div>
            </AnimatedSection>

            {/* Order Processing */}
            <AnimatedSection direction="up">
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 border border-[var(--foil-soft)] shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-6 h-6 text-[var(--brand)]" />
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Order Processing</h2>
                </div>
                <ul className="space-y-3 text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">1.</span>
                    After payment confirmation, we process your order immediately.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">2.</span>
                    A Delhivery shipment is created and you get a tracking number via email/SMS.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">3.</span>
                    Track your order in real-time from your account under &quot;My Orders&quot;.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">4.</span>
                    Download your invoice from the order details page.
                  </li>
                </ul>
              </div>
            </AnimatedSection>

            {/* Important Notes */}
            <AnimatedSection direction="up">
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 border border-[var(--foil-soft)] shadow-[var(--shadow-sm)]">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-[var(--ink-40)]" />
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Important Notes</h2>
                </div>
                <ul className="space-y-3 text-[var(--ink)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">-</span>
                    Ensure someone is available at the delivery address to receive the package.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">-</span>
                    If delivery fails, the courier makes up to 2 additional attempts.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">-</span>
                    Our medicines are packaged to maintain quality during transit.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--brand)] font-bold mt-1">-</span>
                    Report shipping damage within 24 hours with photos.
                  </li>
                </ul>
              </div>
            </AnimatedSection>

            {/* Contact */}
            <AnimatedSection direction="up">
              <div className="bg-[var(--ink)] rounded-[var(--radius-md)] p-8 text-[var(--paper-card)]">
                <h2 className="text-2xl font-bold font-display mb-4">Questions About Shipping?</h2>
                <p className="text-[var(--ink-40)] mb-6">
                  Our customer support team is happy to help with any shipping queries.
                </p>
                <div className="flex flex-wrap gap-6">
                  <a href={CONTACT.emailHref} className="flex items-center gap-2 text-[var(--paper-card)] hover:text-[var(--brand-soft)] transition">
                    <Mail className="w-5 h-5" />
                    {CONTACT.email}
                  </a>
                  <a href={CONTACT.phoneHref} className="flex items-center gap-2 text-[var(--paper-card)] hover:text-[var(--brand-soft)] transition">
                    <Phone className="w-5 h-5" />
                    {CONTACT.phone}
                  </a>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </main>
  )
}
