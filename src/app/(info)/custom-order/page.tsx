import type { Metadata } from "next"
import { CustomOrderForm } from "@/components/custom-order/CustomOrderForm"

export const metadata: Metadata = {
  title: "Custom order — request a medicine",
  description:
    "Can't find your medicine at PM Store? Request it and we'll source it for you at generic prices, delivered across Bhopal. Tell us what you need and we'll call you back.",
  alternates: { canonical: "/custom-order" },
}

export default function CustomOrderPage() {
  return (
    <div className="bg-[var(--paper)]">
      <section id="request" className="mx-auto max-w-[1600px] px-4 py-8 md:py-12">
        <h1 className="mb-4 text-[length:var(--step-1)] text-[var(--ink)]">
          Request a medicine
        </h1>
        <CustomOrderForm />
      </section>
    </div>
  )
}
