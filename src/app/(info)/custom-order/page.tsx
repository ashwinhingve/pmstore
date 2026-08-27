import type { Metadata } from "next"
import Link from "next/link"
import { Search, PhoneCall, PackageCheck, ClipboardList, ShieldCheck } from "lucide-react"
import { CustomOrderForm } from "@/components/custom-order/CustomOrderForm"
import { WhatsAppGlyph } from "@/components/shared/WhatsAppGlyph"
import { waHref } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Custom order — request a medicine",
  description:
    "Can't find your medicine at PM Store? Request it and we'll source it for you at generic prices, delivered across Bhopal. Tell us what you need and we'll call you back.",
  alternates: { canonical: "/custom-order" },
}

const STEPS = [
  { icon: ClipboardList, title: "Tell us what you need" },
  { icon: Search, title: "We check availability" },
  { icon: PhoneCall, title: "We call you back" },
  { icon: PackageCheck, title: "Delivered to you" },
]

export default function CustomOrderPage() {
  return (
    <div className="bg-[var(--paper)]">
      {/* Compact intro — a couple of lines, not a full hero, so the form is the
          first thing a visitor has to scroll past. */}
      <section className="mx-auto max-w-[1600px] xl:w-4/5 px-4 pt-10 pb-2 md:pt-14">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">Custom order</p>
        <h1 className="max-w-2xl text-[length:var(--step-2)] text-[var(--ink)]">
          Request a medicine
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--ink-70)]">
          Can&apos;t find it in our catalogue? Tell us what you need — we&apos;ll source it
          through licensed suppliers at generic prices and call you back to confirm.
        </p>
      </section>

      {/* Request form — the primary action, right below the intro. Spans the
          full rail (no xl:w-4/5) so the form fields have room to breathe. */}
      <section id="request" className="mx-auto max-w-[1600px] px-4 pb-14 pt-6 md:pb-20">
        <div className="mb-6 flex max-w-md items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 shadow-[var(--shadow-sm)]">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
          <p className="text-sm text-[var(--ink-70)]">
            Prescription medicines (Schedule H / H1 / X) are dispensed only against a valid
            prescription. Tick the box in the form and we&apos;ll collect it before delivery.
          </p>
        </div>
        <CustomOrderForm />
      </section>

      {/* Condensed "how it works" + secondary CTAs — icon + title only, no body
          copy, kept below the form so it never gates it on mobile. */}
      <section className="border-t border-[var(--foil-soft)] bg-[var(--paper-card)]">
        <div className="mx-auto max-w-[1600px] xl:w-4/5 px-4 py-10">
          <ol className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <li key={s.title} className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-[var(--ink)]">
                    {i + 1}. {s.title}
                  </span>
                </li>
              )
            })}
          </ol>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-[var(--foil-soft)] pt-6 sm:justify-start">
            <a
              href={waHref("Hi, I'd like to request a medicine.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)] underline-offset-4 hover:underline"
            >
              <WhatsAppGlyph className="h-4 w-4" />
              Chat on WhatsApp
            </a>
            <Link
              href="/products"
              className="text-sm font-semibold text-[var(--ink)] underline-offset-4 hover:underline"
            >
              Browse the catalogue
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
