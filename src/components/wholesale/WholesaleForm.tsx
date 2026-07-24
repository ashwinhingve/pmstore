"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  wholesaleEnquirySchema,
  type WholesaleEnquiryInput,
  MONTHLY_VOLUME_OPTIONS,
} from "@/lib/validations/wholesale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { FormField } from "@/components/ui/form-field"
import { CheckCircle2 } from "lucide-react"

const volumeOptions = MONTHLY_VOLUME_OPTIONS.map((o) => ({ value: o.value, label: o.label }))

export function WholesaleForm() {
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WholesaleEnquiryInput>({
    resolver: zodResolver(wholesaleEnquirySchema),
    defaultValues: {
      businessName: "",
      contactPerson: "",
      phone: "",
      email: "",
      gstNumber: "",
      drugLicenseNumber: "",
      addressLine: "",
      city: "",
      state: "",
      pincode: "",
      productRequirements: "",
      quantity: "",
      preferredBrands: "",
      monthlyVolume: "",
      notes: "",
      website: "",
    },
  })

  const onSubmit = async (values: WholesaleEnquiryInput) => {
    setServerError("")
    try {
      const res = await fetch("/api/wholesale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setServerError(
          data?.error?.message ||
            "We couldn't send your enquiry. Please try again, or call us."
        )
        return
      }
      setSubmitted(true)
      reset()
    } catch {
      setServerError("We couldn't send your enquiry. Please try again, or call us.")
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mint-soft)]">
          <CheckCircle2 className="h-7 w-7 text-[var(--mint)]" aria-hidden="true" />
        </div>
        <h3 className="mb-2 text-[length:var(--step-1)] text-[var(--ink)]">Enquiry received</h3>
        <p className="mx-auto max-w-md text-[var(--ink-70)]">
          Thanks — our wholesale team will get back to you within one working day. For anything
          urgent, call us during business hours.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setSubmitted(false)
            setServerError("")
          }}
        >
          Send another enquiry
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-card)] md:p-8"
    >
      {serverError && (
        <div
          role="alert"
          className="mb-6 rounded-[var(--radius-sm)] border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-[var(--ink)]"
        >
          {serverError}
        </div>
      )}

      {/* Business details */}
      <h3 className="mb-4 text-[length:var(--step-0)] font-semibold uppercase tracking-wide text-[var(--ink-70)]">
        Business details
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="Business name" required htmlFor="businessName">
          <Input id="businessName" {...register("businessName")} error={errors.businessName?.message} placeholder="Your pharmacy or firm" />
        </FormField>
        <FormField label="Contact person" required htmlFor="contactPerson">
          <Input id="contactPerson" {...register("contactPerson")} error={errors.contactPerson?.message} placeholder="Full name" />
        </FormField>
        <FormField label="Phone" required htmlFor="phone">
          <Input id="phone" type="tel" inputMode="numeric" {...register("phone")} error={errors.phone?.message} placeholder="10-digit mobile" />
        </FormField>
        <FormField label="Email" required htmlFor="email">
          <Input id="email" type="email" {...register("email")} error={errors.email?.message} placeholder="you@business.com" />
        </FormField>
      </div>

      {/* Compliance */}
      <h3 className="mb-4 mt-8 text-[length:var(--step-0)] font-semibold uppercase tracking-wide text-[var(--ink-70)]">
        Licence &amp; compliance
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField label="GSTIN" htmlFor="gstNumber">
          <Input id="gstNumber" {...register("gstNumber")} error={errors.gstNumber?.message} placeholder="15-character GSTIN" />
        </FormField>
        <FormField label="Drug licence number" htmlFor="drugLicenseNumber">
          <Input id="drugLicenseNumber" {...register("drugLicenseNumber")} error={errors.drugLicenseNumber?.message} placeholder="DL number" />
        </FormField>
      </div>

      {/* Address */}
      <h3 className="mb-4 mt-8 text-[length:var(--step-0)] font-semibold uppercase tracking-wide text-[var(--ink-70)]">
        Delivery address
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <FormField label="Address" htmlFor="addressLine">
          <Input id="addressLine" {...register("addressLine")} error={errors.addressLine?.message} placeholder="Shop / street" />
        </FormField>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField label="City" htmlFor="city">
            <Input id="city" {...register("city")} error={errors.city?.message} />
          </FormField>
          <FormField label="State" htmlFor="state">
            <Input id="state" {...register("state")} error={errors.state?.message} />
          </FormField>
          <FormField label="PIN code" htmlFor="pincode">
            <Input id="pincode" inputMode="numeric" {...register("pincode")} error={errors.pincode?.message} placeholder="6 digits" />
          </FormField>
        </div>
      </div>

      {/* Requirement */}
      <h3 className="mb-4 mt-8 text-[length:var(--step-0)] font-semibold uppercase tracking-wide text-[var(--ink-70)]">
        What you need
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <FormField label="Product requirements" htmlFor="productRequirements">
          <Textarea id="productRequirements" {...register("productRequirements")} error={errors.productRequirements?.message} placeholder="Medicines, categories, or a product list" />
        </FormField>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Quantity" htmlFor="quantity">
            <Input id="quantity" {...register("quantity")} error={errors.quantity?.message} placeholder="e.g. 200 strips / month" />
          </FormField>
          <FormField label="Preferred brands" htmlFor="preferredBrands">
            <Input id="preferredBrands" {...register("preferredBrands")} error={errors.preferredBrands?.message} placeholder="Optional" />
          </FormField>
        </div>
        <FormField label="Expected monthly purchase volume" htmlFor="monthlyVolume">
          <Select id="monthlyVolume" options={volumeOptions} {...register("monthlyVolume")} error={errors.monthlyVolume?.message} />
        </FormField>
        <FormField label="Additional notes" htmlFor="notes">
          <Textarea id="notes" {...register("notes")} error={errors.notes?.message} placeholder="Anything else we should know" />
        </FormField>
      </div>

      {/* Honeypot — hidden from users, catches bots */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        {...register("website")}
      />

      <Button type="submit" disabled={isSubmitting} className="mt-8 h-12 w-full text-base font-semibold md:w-auto md:px-10">
        {isSubmitting ? "Sending…" : "Send enquiry"}
      </Button>
      <p className="mt-3 text-sm text-[var(--ink-70)]">
        We reply within one working day. Your details are used only to prepare your quote.
      </p>
    </form>
  )
}
