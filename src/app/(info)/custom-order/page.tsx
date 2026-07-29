import type { Metadata } from "next"
import Link from "next/link"
import { Search, PhoneCall, PackageCheck, ClipboardList, ShieldCheck, ArrowRight } from "lucide-react"
import { CustomOrderForm } from "@/components/custom-order/CustomOrderForm"

export const metadata: Metadata = {
  title: "Custom order — request a medicine",
  description:
    "Can't find your medicine at Pratigya Medical Store? Request it and we'll source it for you — genuine stock, generic prices, delivered across Bhopal. Tell us what you need and we'll call you back.",
  alternates: { canonical: "/custom-order" },
}

const STEPS = [
  { icon: ClipboardList, title: "Tell us what you need", body: "Share the medicine name, strength and how much — a brand, a salt, or a short list." },
  { icon: Search, title: "We check availability", body: "We source it through our licensed suppliers and confirm the genuine, best-price option." },
  { icon: PhoneCall, title: "We call you back", body: "Usually within a working day, with price and timing — and to collect a prescription if it's needed." },
  { icon: PackageCheck, title: "Delivered to you", body: "Confirm the order and we deliver to your door across Bhopal." },
]

export default function CustomOrderPage() {
  return (
    <div className="bg-[var(--paper)]">
      {/* Hero */}
      <section className="mx-auto max-w-[1600px] xl:w-4/5 px-4 py-16 md:py-20">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">Custom order</p>
        <h1 className="max-w-3xl text-[length:var(--step-3)] text-[var(--ink)]">
          Can&apos;t find your medicine? Request it.
        </h1>
        <p className="mt-4 max-w-2xl text-[length:var(--step-1)] text-[var(--ink-70)]">
          Tell us the medicine you need — even if it isn&apos;t in our catalogue. We&apos;ll source
          it through licensed suppliers at generic prices and call you back to confirm.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="#request"
            className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--brand)] px-6 font-semibold text-[var(--brand-ink)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-deep)]"
          >
            Request a medicine <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/products"
            className="inline-flex h-12 items-center rounded-[var(--radius-sm)] border-2 border-[var(--foil-soft)] bg-[var(--paper-card)] px-6 font-semibold text-[var(--ink)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)]"
          >
            Browse the catalogue
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-[var(--foil-soft)] bg-[var(--paper-card)]">
        <div className="mx-auto max-w-[1600px] xl:w-4/5 px-4 py-16">
          <h2 className="mb-8 text-[length:var(--step-2)] text-[var(--ink)]">How it works</h2>
          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <li key={s.title} className="relative">
                  <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="text-xs font-semibold text-[var(--ink-40)]" style={{ fontFamily: "var(--font-data)" }}>
                    Step {i + 1}
                  </p>
                  <h3 className="mb-1 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">{s.title}</h3>
                  <p className="text-sm text-[var(--ink-70)]">{s.body}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Request form — spans the full rail */}
      <section id="request" className="mx-auto max-w-[1600px] xl:w-4/5 px-4 py-16 md:py-20">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-[length:var(--step-2)] text-[var(--ink)]">Request a medicine</h2>
            <p className="mt-3 text-[var(--ink-70)]">
              Only your name, phone and the medicine you need are required. The more you tell us,
              the faster we can confirm.
            </p>
          </div>
          <div className="flex max-w-md items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 shadow-[var(--shadow-sm)]">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
            <p className="text-sm text-[var(--ink-70)]">
              Prescription medicines (Schedule H / H1 / X) are dispensed only against a valid
              prescription. Tick the box in the form and we&apos;ll collect it before delivery.
            </p>
          </div>
        </div>
        <CustomOrderForm />
      </section>
    </div>
  )
}
