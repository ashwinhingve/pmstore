import type { Metadata } from "next"
import Link from "next/link"
import {
  TrendingDown,
  ShieldCheck,
  Truck,
  FileText,
  Headphones,
  PackageCheck,
  ArrowRight,
} from "lucide-react"
import { WholesaleForm } from "@/components/wholesale/WholesaleForm"

export const metadata: Metadata = {
  title: "Wholesale & bulk supply",
  description:
    "Bulk medicine supply for pharmacies, clinics and institutions from Pratigya Medical Store — genuine, licensed stock, GST invoicing and reliable monthly delivery. Request a wholesale quote.",
  alternates: { canonical: "/wholesale" },
}

const BENEFITS = [
  { icon: TrendingDown, title: "Wholesale pricing", body: "Volume rates that protect your margins on regular purchases." },
  { icon: ShieldCheck, title: "Genuine, licensed stock", body: "Sourced through licensed channels with proper batch and expiry records." },
  { icon: Truck, title: "Reliable monthly supply", body: "Standing orders delivered on a schedule so you never run short." },
  { icon: FileText, title: "Proper GST invoicing", body: "Clean tax invoices for your accounts and input credit." },
  { icon: Headphones, title: "A person to call", body: "A dedicated contact for your account, not a queue." },
  { icon: PackageCheck, title: "Wide catalogue", body: "Generics and brands across categories, sourced to your list." },
]

const STEPS = [
  { n: "1", title: "Send your enquiry", body: "Tell us what you need and how often." },
  { n: "2", title: "We prepare a quote", body: "Pricing and availability for your list, usually within a working day." },
  { n: "3", title: "Confirm the order", body: "Agree quantities, GST invoicing and the delivery schedule." },
  { n: "4", title: "Regular delivery", body: "We keep the supply coming so you can plan ahead." },
]

const FAQS = [
  {
    q: "What is the minimum order?",
    a: "Minimum order values depend on the product mix. We confirm the minimum for your specific list in the quote.",
  },
  {
    q: "Do you supply Schedule H / H1 medicines wholesale?",
    a: "Yes, to buyers with a valid drug licence. Share your DL number in the form and we will verify before supply.",
  },
  {
    q: "How is delivery handled?",
    a: "We arrange delivery on an agreed schedule. Coverage and lead time are confirmed with your quote based on your location.",
  },
  {
    q: "Can I get GST invoices?",
    a: "Yes. Every wholesale order is billed with a proper GST invoice for your records and input credit.",
  },
]

export default function WholesalePage() {
  return (
    <div className="bg-[var(--paper)]">
      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 md:py-20">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--mint)]">Wholesale</p>
        <h1 className="max-w-3xl text-[length:var(--step-3)] text-[var(--ink)]">
          Bulk supply for pharmacies, clinics and institutions
        </h1>
        <p className="mt-4 max-w-2xl text-[length:var(--step-1)] text-[var(--ink-70)]">
          Genuine, licensed stock at wholesale rates, with GST invoicing and a delivery schedule
          you can plan around. Send us your list and we&apos;ll come back with a quote.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="#enquiry"
            className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--ink)] px-6 font-semibold text-[var(--paper-card)] hover:opacity-90"
          >
            Request a quote <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-12 items-center rounded-[var(--radius-sm)] border-2 border-[var(--foil-soft)] bg-[var(--paper-card)] px-6 font-semibold text-[var(--ink)] hover:bg-[var(--foil-soft)]"
          >
            Talk to us
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-[1200px] px-4 pb-16">
        <h2 className="mb-8 text-[length:var(--step-2)] text-[var(--ink)]">Why buy wholesale from us</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-card)]">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--mint-soft)]">
                <Icon className="h-5 w-5 text-[var(--mint)]" aria-hidden="true" />
              </div>
              <h3 className="mb-1 text-[length:var(--step-1)] text-[var(--ink)]">{title}</h3>
              <p className="text-[var(--ink-70)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-[var(--foil-soft)] bg-[var(--paper-card)]">
        <div className="mx-auto max-w-[1200px] px-4 py-16">
          <h2 className="mb-8 text-[length:var(--step-2)] text-[var(--ink)]">How it works</h2>
          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="relative">
                <span
                  className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--paper-card)]"
                  style={{ fontFamily: "var(--font-data)" }}
                >
                  {s.n}
                </span>
                <h3 className="mb-1 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">{s.title}</h3>
                <p className="text-sm text-[var(--ink-70)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Enquiry form */}
      <section id="enquiry" className="mx-auto max-w-[1200px] px-4 py-16 md:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-[length:var(--step-2)] text-[var(--ink)]">Request a wholesale quote</h2>
            <p className="mt-3 text-[var(--ink-70)]">
              Fill in as much as you can — only your business name, contact, phone and email are
              required. The rest helps us prepare an accurate quote faster.
            </p>
            <div className="mt-6 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--mint)]" aria-hidden="true" />
                <p className="text-sm text-[var(--ink-70)]">
                  Schedule H / H1 medicines are supplied only to buyers with a valid drug licence.
                  Add your DL number and we&apos;ll verify before supply.
                </p>
              </div>
            </div>
          </div>
          <WholesaleForm />
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-[var(--foil-soft)] bg-[var(--paper-card)]">
        <div className="mx-auto max-w-[800px] px-4 py-16">
          <h2 className="mb-8 text-[length:var(--step-2)] text-[var(--ink)]">Wholesale FAQs</h2>
          <dl className="divide-y divide-[var(--foil-soft)]">
            {FAQS.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="text-[length:var(--step-1)] font-semibold text-[var(--ink)]">{f.q}</dt>
                <dd className="mt-2 text-[var(--ink-70)]">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}
