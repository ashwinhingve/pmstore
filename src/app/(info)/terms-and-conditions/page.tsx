import type { Metadata } from "next"
import Link from "next/link"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { SITE_NAME, CONTACT, SITE_URL, LEGAL } from "@/lib/constants"
import { FileText, ShoppingCart, CreditCard, Package, Scale, Mail, Stethoscope, Pill, Landmark } from "lucide-react"

export const metadata: Metadata = {
  title: "Terms & Conditions | PM Store",
  description:
    "The terms governing your use of Pratigya Medical Store — eligibility, prescriptions, orders, payments, pricing, liability and governing law.",
  alternates: { canonical: "/terms-and-conditions" },
}

export default function TermsConditionsPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[var(--paper)] py-12 sm:py-20 md:py-32">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-[var(--brand)] rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-[var(--brand-ink)]" />
            </div>
            <h1 className="text-[length:var(--step-3)] mb-6 text-[var(--ink)]">
              Terms &amp; Conditions
            </h1>
            <p className="text-xl md:text-2xl text-[var(--ink-70)] mb-4">
              Please read these terms carefully
            </p>
            <p className="text-base text-[var(--ink-40)]">
              Last Updated: August 2026
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-16 md:py-24 bg-[var(--paper-card)]">
        <div className="container mx-auto px-4 max-w-4xl">
          <AnimatedSection direction="up" className="space-y-8">
            {/* Introduction */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
              <p className="text-[var(--ink)] leading-relaxed">
                By accessing or using <strong>{SITE_URL}</strong>, you agree to these terms and
                conditions. Please read them carefully before placing an order. If you do not agree,
                please do not use the website.
              </p>
            </div>

            {/* Eligibility & Account */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Eligibility &amp; Your Account</h2>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• You must be 18 or older and able to enter into a binding contract</li>
                    <li>• You are responsible for keeping your account details and password confidential</li>
                    <li>• You are responsible for activity that happens under your account; tell us promptly of any unauthorised use</li>
                    <li>• Please provide accurate contact and delivery details — we are not responsible for failed deliveries caused by incorrect information</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Pharmacy & Prescriptions */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Pill className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Pharmacy &amp; Prescriptions</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    {SITE_NAME} is a licensed retail pharmacy operating under the Drugs &amp; Cosmetics
                    Act, 1940 and the Pharmacy Act, 1948.
                  </p>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• You can place an order without uploading a prescription at checkout</li>
                    <li>• For scheduled medicines (Schedule H, H1 and X), our registered pharmacist verifies a valid prescription <strong>before the order is dispatched and delivered</strong></li>
                    <li>• We may contact you for a prescription, or decline to dispense, where the law requires it</li>
                  </ul>
                  <p className="text-[var(--ink)] leading-relaxed mt-3">
                    See our{" "}
                    <Link href="/drug-licence" className="text-[var(--brand)] underline">
                      drug licence &amp; compliance
                    </Link>{" "}
                    page for our licence details.
                  </p>
                </div>
              </div>
            </div>

            {/* Medical Disclaimer */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-4">No Medical Advice</h2>
                  <p className="text-[var(--ink)] leading-relaxed">
                    Information on this website is for general reference only and is not a substitute
                    for professional medical advice, diagnosis or treatment. Always consult a
                    registered medical practitioner before starting, stopping or changing any medicine.
                    Never disregard professional advice because of something you read here.
                  </p>
                </div>
              </div>
            </div>

            {/* Product Information & Pricing */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Product Information &amp; Pricing</h2>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• We provide accurate descriptions with composition, strength and pack size</li>
                    <li>• Prices are in Indian Rupees (₹). To help you compare fairly, we show the price per tablet/ml alongside the pack price</li>
                    <li>• Packaging may vary by manufacturer; all medicines are sourced from licensed distributors</li>
                    <li>• Prices, availability and offers may change without prior notice</li>
                    <li>• If a genuine pricing or stock error occurs, we may correct it and cancel any affected order, refunding any amount paid</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Orders & Payments */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Orders &amp; Payments</h2>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• Orders are confirmed only after successful payment (or confirmation of a cash-on-delivery order, where offered)</li>
                    <li>• We reserve the right to cancel orders due to stock issues, suspected fraud, or prescription requirements not being met</li>
                    <li>• Cancellations and refunds are governed by our{" "}
                      <Link href="/refund-policy" className="text-[var(--brand)] underline">Return &amp; Refund Policy</Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Payment Gateway Disclaimer */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-4">Payment Gateway Disclaimer</h2>
                  <div className="space-y-3 text-[var(--ink)]">
                    <p className="leading-relaxed">
                      All payments are processed through secure, PCI-DSS compliant payment gateways.
                    </p>
                    <p className="leading-relaxed">
                      {SITE_NAME} does not have access to your payment credentials.
                    </p>
                    <p className="leading-relaxed">
                      Transaction delays or failures are subject to banking and payment gateway policies.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping & Delivery */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Shipping &amp; Delivery</h2>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• Delivery timelines are estimates and may vary due to logistics or unforeseen circumstances</li>
                    <li>• {SITE_NAME} is not liable for courier-related delays outside our control</li>
                    <li>• Full details are on our{" "}
                      <Link href="/shipping-policy" className="text-[var(--brand)] underline">Shipping Policy</Link> page
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Intellectual Property */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Intellectual Property</h2>
              <p className="text-[var(--ink)] leading-relaxed">
                All website content, logos, images, and branding are the exclusive property of {SITE_NAME} and may not be used without written permission.
              </p>
            </div>

            {/* Limitation of Liability */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Limitation of Liability</h2>
              <p className="text-[var(--ink)] leading-relaxed mb-3">
                To the extent permitted by law, {SITE_NAME} shall not be liable for:
              </p>
              <ul className="space-y-2 text-[var(--ink)]">
                <li>• Indirect or consequential damages</li>
                <li>• Improper storage or misuse of medicines after delivery</li>
                <li>• Adverse reactions (always consult your doctor before use)</li>
              </ul>
            </div>

            {/* Licensed Entity Disclosure */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Landmark className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-4">Licensed Entity</h2>
                  <div className="space-y-2 text-[var(--ink)]">
                    <p><strong>{SITE_NAME}</strong> — {LEGAL.constitution}</p>
                    <p>Proprietor: {LEGAL.proprietor}</p>
                    <p>Drug sale licence (Form 20): {LEGAL.drugLicence.form20}</p>
                    <p>Drug sale licence (Form 21): {LEGAL.drugLicence.form21}</p>
                    <p>Valid up to: {LEGAL.drugLicence.validTo} · Licensing authority: {LEGAL.drugLicence.authority}</p>
                    <p>Udyam (MSME) registration: {LEGAL.udyam}</p>
                    <p>MP Shops &amp; Establishments (Gumasta): {LEGAL.gumasta}</p>
                    <p>GSTIN: Not applicable</p>
                    <p>Registered mobile: {LEGAL.registeredMobile}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Governing Law */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Scale className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Governing Law</h2>
                  <p className="text-[var(--ink)] leading-relaxed">
                    These terms are governed by the laws of India. The courts at Bhopal, Madhya Pradesh
                    shall have exclusive jurisdiction over any dispute.
                  </p>
                </div>
              </div>
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
                    <p>🌐 Website: {SITE_URL}</p>
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
