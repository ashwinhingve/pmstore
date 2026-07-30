import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { SITE_NAME, CONTACT } from "@/lib/constants"
import { RefreshCcw, AlertCircle, PackageCheck, Phone, Mail, Camera } from "lucide-react"

export default function ReturnPolicyPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[var(--paper)] py-20 md:py-32">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-[var(--brand)] rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCcw className="w-10 h-10 text-[var(--brand-ink)]" />
            </div>
            <h1 className="text-[length:var(--step-3)] mb-6 text-[var(--ink)]">
              Return & Refund Policy
            </h1>
            <p className="text-xl md:text-2xl text-[var(--ink-70)] mb-4">
              Quality medicines with hassle-free replacements
            </p>
            <p className="text-base text-[var(--ink-40)]">
              Last Updated: February 2026
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Policy Content */}
      <section className="py-16 md:py-24 bg-[var(--paper-card)]">
        <div className="container mx-auto px-4 max-w-4xl">
          <AnimatedSection direction="up" className="space-y-8">
            {/* Introduction */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
              <p className="text-[var(--ink)] leading-relaxed">
                {SITE_NAME} is committed to providing genuine, safely packaged medicines. Due to the nature of pharmaceuticals, please read this policy carefully before placing an order.
              </p>
            </div>

            {/* Non-Returnable Products */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Non-Returnable Medicines</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    All medicines and consumables are non-returnable once delivered, for hygiene and safety reasons. Exceptions:
                  </p>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• Wrong medicine delivered</li>
                    <li>• Medicine received damaged or defective</li>
                    <li>• Manufacturing defect or expiry issue</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Wrong/Damaged/Defective Product */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <PackageCheck className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Wrong / Damaged / Defective Medicine</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-4">
                    Report issues within <strong>48 hours of delivery</strong>.
                  </p>

                  <h3 className="text-xl font-semibold font-display text-[var(--ink)] mb-3">How to Raise a Complaint</h3>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    Contact us via:
                  </p>
                  <div className="space-y-2 text-[var(--ink)] mb-4">
                    <p>📞 Helpline: {CONTACT.phone}</p>
                    <p>📧 Email: {CONTACT.email}</p>
                  </div>

                  <div className="bg-[var(--brand-soft)] rounded-[var(--radius-md)] p-6 border-l-4 border-[var(--brand)]">
                    <h4 className="font-semibold font-display text-[var(--ink)] mb-2 flex items-center gap-2">
                      <Camera className="w-5 h-5" />
                      Required Evidence
                    </h4>
                    <p className="text-[var(--ink)] leading-relaxed mb-2">
                      Provide:
                    </p>
                    <ul className="space-y-1 text-[var(--ink)]">
                      <li>• Clear photos of the medicine and packaging</li>
                      <li>• Unboxing or delivery video</li>
                    </ul>
                    <p className="text-[var(--ink)] leading-relaxed mt-3 text-sm">
                      <strong>Note:</strong> Claims without photographic or video proof may be rejected.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Replacement or Refund */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-4">Replacement or Refund</h2>
              <div className="space-y-3 text-[var(--ink)]">
                <p className="leading-relaxed">
                  After verifying your proof, we will review the claim.
                </p>
                <p className="leading-relaxed">
                  ✓ If available, a <strong>replacement medicine</strong> ships free of cost.
                </p>
                <p className="leading-relaxed">
                  ✓ If unavailable, a <strong>full refund</strong> is processed.
                </p>
                <p className="leading-relaxed">
                  Refunds go to your original payment method within <strong>7–10 working days</strong> after approval.
                </p>
              </div>
            </div>

            {/* Order Cancellation */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Order Cancellation</h2>
              <div className="text-[var(--ink)] space-y-2">
                <p className="leading-relaxed">
                  • Orders can be cancelled only <strong>before dispatch</strong>
                </p>
                <p className="leading-relaxed">
                  • Once dispatched, cancellations cannot be accepted
                </p>
              </div>
            </div>

            {/* Shipping Charges */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Shipping Charges</h2>
              <div className="text-[var(--ink)] space-y-2">
                <p className="leading-relaxed">
                  • Shipping charges are <strong>non-refundable</strong>
                </p>
                <p className="leading-relaxed">
                  • If the error is ours, we cover shipping costs
                </p>
              </div>
            </div>

            {/* Company Rights */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Company Rights</h2>
              <p className="text-[var(--ink)] leading-relaxed">
                {SITE_NAME} reserves the right to:
              </p>
              <ul className="space-y-2 text-[var(--ink)]">
                <li>• Reject claims without valid proof</li>
                <li>• Modify this policy anytime</li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-4">Contact Information</h2>
                  <div className="space-y-2 text-[var(--ink)]">
                    <p><strong>{SITE_NAME}</strong></p>
                    <p>📍 {CONTACT.addressFull}</p>
                    <p>📧 Email: {CONTACT.email}</p>
                    <p>📞 Phone: {CONTACT.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  )
}