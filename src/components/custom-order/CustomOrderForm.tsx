"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { customOrderSchema, type CustomOrderInput } from "@/lib/validations/custom-order"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/ui/form-field"
import { CheckCircle2 } from "lucide-react"

export function CustomOrderForm() {
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState("")

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomOrderInput>({
    resolver: zodResolver(customOrderSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      medicines: "",
      quantity: "",
      deliveryArea: "",
      pincode: "",
      hasPrescription: false,
      notes: "",
      website: "",
    },
  })

  const onSubmit = async (values: CustomOrderInput) => {
    setServerError("")
    try {
      const res = await fetch("/api/custom-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setServerError(
          data?.error?.message ||
            "We couldn't send your request. Please try again, or call us."
        )
        return
      }
      setSubmitted(true)
      reset()
    } catch {
      setServerError("We couldn't send your request. Please try again, or call us.")
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-8 text-center shadow-[var(--shadow-sm)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mint-soft)]">
          <CheckCircle2 className="h-7 w-7 text-[var(--mint)]" aria-hidden="true" />
        </div>
        <h3 className="mb-2 text-[length:var(--step-1)] text-[var(--ink)]">Request received</h3>
        <p className="mx-auto max-w-md text-[var(--ink-70)]">
          Thanks — we&apos;ll check availability and call you back, usually within a working day.
          Keep your phone handy.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => {
            setSubmitted(false)
            setServerError("")
          }}
        >
          Request another medicine
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)] md:p-8"
    >
      {serverError && (
        <div
          role="alert"
          className="mb-6 rounded-[var(--radius-sm)] border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-[var(--ink)]"
        >
          {serverError}
        </div>
      )}

      <div className="grid gap-x-8 gap-y-8 lg:grid-cols-2">
        <div>
      {/* Your details */}
      <h3 className="mb-4 text-[length:var(--step-0)] font-semibold uppercase tracking-wide text-[var(--ink-70)]">
        Your details
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <FormField label="Your name" required htmlFor="name">
          <Input id="name" {...register("name")} error={errors.name?.message} placeholder="Full name" />
        </FormField>
        <FormField label="Phone" required htmlFor="phone">
          <Input id="phone" type="tel" inputMode="numeric" {...register("phone")} error={errors.phone?.message} placeholder="10-digit mobile" />
        </FormField>
        <FormField label="Email" htmlFor="email">
          <Input id="email" type="email" {...register("email")} error={errors.email?.message} placeholder="Optional" />
        </FormField>
        <FormField label="Delivery area" htmlFor="deliveryArea">
          <Input id="deliveryArea" {...register("deliveryArea")} error={errors.deliveryArea?.message} placeholder="Area / locality" />
        </FormField>
        <FormField label="PIN code" htmlFor="pincode">
          <Input id="pincode" inputMode="numeric" {...register("pincode")} error={errors.pincode?.message} placeholder="6 digits" />
        </FormField>
      </div>
        </div>

        <div>
      {/* What you need */}
      <h3 className="mb-4 text-[length:var(--step-0)] font-semibold uppercase tracking-wide text-[var(--ink-70)]">
        What you need
      </h3>
      <div className="grid grid-cols-1 gap-4">
        <FormField label="Medicine(s) you need" required htmlFor="medicines">
          <Textarea id="medicines" {...register("medicines")} error={errors.medicines?.message} placeholder="Brand or salt name, strength and form — e.g. 'Foracort 200 inhaler', or a short list" />
        </FormField>
        <FormField label="How much / how often" htmlFor="quantity">
          <Input id="quantity" {...register("quantity")} error={errors.quantity?.message} placeholder="e.g. 1 inhaler, or 2 strips a month" />
        </FormField>
        <label className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-tint)] p-4">
          <input
            type="checkbox"
            {...register("hasPrescription")}
            className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
          />
          <span className="text-sm text-[var(--ink-70)]">
            I have a prescription for this. Schedule H / H1 / X medicines can only be dispensed
            against a valid prescription — we&apos;ll collect it before delivery.
          </span>
        </label>
        <FormField label="Anything else" htmlFor="notes">
          <Textarea id="notes" {...register("notes")} error={errors.notes?.message} placeholder="Optional — timing, alternatives you're open to, etc." />
        </FormField>
      </div>
        </div>
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

      <Button type="submit" disabled={isSubmitting} className="mt-8 h-12 w-full bg-[var(--brand)] text-base font-semibold text-[var(--brand-ink)] hover:bg-[var(--brand-deep)] md:w-auto md:px-10">
        {isSubmitting ? "Sending…" : "Send request"}
      </Button>
      <p className="mt-3 text-sm text-[var(--ink-70)]">
        We reply within one working day. Your details are used only to source your medicine.
      </p>
    </form>
  )
}
