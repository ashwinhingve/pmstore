import type { Metadata } from "next"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { SITE_NAME, CONTACT, SITE_URL, LEGAL } from "@/lib/constants"
import { Shield, Database, UserCheck, Eye, Lock, Mail, HeartPulse, Cookie } from "lucide-react"

export const metadata: Metadata = {
  title: "Privacy Policy | PM Store",
  description:
    "How Pratigya Medical Store collects, uses and protects your personal and health information — including prescriptions — under the DPDP Act 2023 and IT Act 2000.",
  alternates: { canonical: "/privacy-policy" },
}

export default function PrivacyPolicyPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[var(--paper)] py-12 sm:py-20 md:py-32">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-[var(--brand)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-[var(--brand-ink)]" />
            </div>
            <h1 className="text-[length:var(--step-3)] mb-6 text-[var(--ink)]">
              Privacy Policy
            </h1>
            <p className="text-xl md:text-2xl text-[var(--ink-70)] mb-4">
              Your privacy is important to us
            </p>
            <p className="text-base text-[var(--ink-40)]">
              Last Updated: August 2026
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="py-16 md:py-24 bg-[var(--paper-card)]">
        <div className="container mx-auto px-4 max-w-4xl">
          <AnimatedSection direction="up" className="space-y-8">
            {/* Concise summary — English + Hindi, for a quick read */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                  In short
                </p>
                <p className="text-[var(--ink)] leading-relaxed">
                  We collect only what we need to fill your order — your name, contact details,
                  delivery address and order history. We never sell your data or share it for
                  marketing. Prescription photos, phone numbers and full addresses are kept private
                  and never logged.
                </p>
              </div>
              <div
                lang="hi"
                className="bg-[var(--paper)] rounded-[var(--radius-md)] p-6 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]"
              >
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">
                  संक्षेप में
                </p>
                <p className="text-[var(--ink)] leading-relaxed">
                  हम केवल वही जानकारी लेते हैं जो आपका ऑर्डर पूरा करने के लिए ज़रूरी है — नाम, संपर्क,
                  पता और ऑर्डर विवरण। हम आपका डेटा किसी को बेचते नहीं और मार्केटिंग के लिए साझा नहीं
                  करते। आपकी पर्ची की फ़ोटो, फ़ोन नंबर और पूरा पता निजी रखा जाता है।
                </p>
              </div>
            </div>

            {/* Introduction */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
              <p className="text-[var(--ink)] leading-relaxed">
                {SITE_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects your privacy and is committed to protecting
                the personal information you share with us. This policy explains what we collect, why,
                and the choices you have. It is aligned with the Digital Personal Data Protection Act,
                2023 (DPDP Act) and the Information Technology Act, 2000 and its rules. We never log
                prescription image URLs, phone numbers, or full addresses.
              </p>
            </div>

            {/* Information We Collect */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Database className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Information We Collect</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    We may collect:
                  </p>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• Name, phone number, email address</li>
                    <li>• Delivery address (stored securely)</li>
                    <li>• Order and transaction details</li>
                    <li>• Prescriptions and health information you choose to share (see below)</li>
                    <li>• Website usage data for analytics</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Health & Prescription Data */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <HeartPulse className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Health &amp; Prescription Data</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    Prescriptions and the medicines you order are sensitive personal information. We
                    handle them with extra care:
                  </p>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• Prescription images are stored on secure, authenticated cloud storage with signed, time-limited access — they are not publicly viewable</li>
                    <li>• Access is restricted to the pharmacist and staff who need it to verify and fulfil your order</li>
                    <li>• Prescription image links, phone numbers and full addresses are never written to our system logs</li>
                    <li>• We use this data only to dispense your medicines lawfully and to keep the records a pharmacy is required to keep</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Use of Information */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Use of Information</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    Your information is used for:
                  </p>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• Order processing and delivery</li>
                    <li>• Customer support and order-related communication</li>
                    <li>• Prescription verification by our registered pharmacist</li>
                    <li>• Legal, regulatory and record-keeping compliance</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Sharing */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Who We Share Data With</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    We never sell or rent your data, and we never share it for third-party marketing.
                    We share the minimum necessary with trusted service providers who help us run the
                    store, only to fulfil your order:
                  </p>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• <strong>Payment gateways</strong> (Razorpay, Cashfree) — to process payments securely</li>
                    <li>• <strong>Cloud image storage</strong> (Cloudinary) — to store product and prescription images</li>
                    <li>• <strong>Email service</strong> (Brevo) — to send order and account emails</li>
                    <li>• <strong>Delivery partners</strong> (e.g. Shiprocket, Delhivery, or our own delivery staff) — to deliver your order</li>
                    <li>• <strong>Sign-in provider</strong> (Google) — if you choose to log in with Google</li>
                  </ul>
                  <p className="text-[var(--ink)] leading-relaxed mt-3">
                    We may also disclose information where required by law or by a competent authority.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Protection & Security */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Data Protection &amp; Security</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    We follow reasonable security practices to protect your data:
                  </p>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• Encrypted connections (HTTPS)</li>
                    <li>• Restricted internal access on a need-to-know basis</li>
                    <li>• Authenticated, signed access for prescription images</li>
                    <li>• Regular system monitoring</li>
                  </ul>
                  <p className="text-[var(--ink)] leading-relaxed mt-4">
                    No method of transmission or storage is completely secure, but we work to protect
                    your data from unauthorised access, misuse or loss.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Security */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-4">Payment Security</h2>
              <div className="space-y-3 text-[var(--ink)]">
                <p className="leading-relaxed">
                  Payments are handled by trusted, PCI-DSS compliant payment gateways.
                </p>
                <p className="leading-relaxed">
                  {SITE_NAME} does not store or process your card, UPI, or net-banking details.
                </p>
                <p className="leading-relaxed">
                  All payment transactions are encrypted and handled directly by the payment provider.
                </p>
              </div>
            </div>

            {/* Cookies */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Cookie className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Cookies &amp; Local Storage</h2>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• Your cart is saved in your browser&apos;s local storage so it is there when you return</li>
                    <li>• A secure sign-in cookie keeps you logged in during your session</li>
                    <li>• We use basic analytics to understand site usage — we do not run third-party advertising trackers</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)]">How Long We Keep Your Data</h2>
              <p className="text-[var(--ink)] leading-relaxed">
                We keep order, prescription and billing records for as long as needed to serve you and
                to meet legal and pharmacy record-keeping requirements. When data is no longer needed,
                it is deleted or anonymised.
              </p>
            </div>

            {/* Your Rights */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Your Rights</h2>
              <p className="text-[var(--ink)] leading-relaxed mb-2">
                You have the right to:
              </p>
              <ul className="space-y-2 text-[var(--ink)]">
                <li>• Access the personal data we hold about you</li>
                <li>• Ask us to correct or update it</li>
                <li>• Ask us to delete it, where we are not required to keep it by law</li>
                <li>• Withdraw consent for future processing</li>
              </ul>
              <p className="text-[var(--ink)] leading-relaxed mt-2">
                To exercise any of these, contact us using the details below.
              </p>
            </div>

            {/* Children */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Children&apos;s Privacy</h2>
              <p className="text-[var(--ink)] leading-relaxed">
                Our website is not directed at children under 18. Medicines for a minor should be
                ordered by a parent or guardian.
              </p>
            </div>

            {/* Consent & Updates */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Consent &amp; Updates</h2>
              <p className="text-[var(--ink)] leading-relaxed">
                By using our website and placing an order, you consent to this Privacy Policy. We may
                update it from time to time; the latest version will always be published on this page.
              </p>
            </div>

            {/* Grievance Officer */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--brand)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-4">Grievance Officer &amp; Contact</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    For any privacy question, request, or grievance, you may contact our Grievance
                    Officer:
                  </p>
                  <div className="space-y-2 text-[var(--ink)]">
                    <p><strong>{LEGAL.grievanceOfficer.name}</strong> — Grievance Officer</p>
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
