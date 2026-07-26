"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/shared/AnimatedSection"
import { FAQAccordion } from "@/components/shared/FAQAccordion"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PhoneInput } from "@/components/ui/phone-input"
import { FormField } from "@/components/ui/form-field"
import { Button } from "@/components/ui/button"
import { CONTACT } from "@/lib/constants"
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  CheckCircle2,
} from "lucide-react"
import Link from "next/link"

// Form validation schema
const contactSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
})

type ContactFormData = z.infer<typeof contactSchema>

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      // Never log the form body — it carries the customer's phone and email.
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setSubmitStatus("success")
        reset()
      } else {
        setSubmitStatus("error")
      }
    } catch {
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const faqItems = [
    {
      question: "What are your business hours?",
      answer: "We're open every day, Monday to Sunday, from 9:00 AM to 9:00 PM. You can also email or WhatsApp us any time and we'll respond within 24 hours.",
    },
    {
      question: "How quickly can I expect a response?",
      answer: "We aim to respond to all inquiries within 24 hours during business days. For urgent matters, please call us directly or use our WhatsApp contact for faster response.",
    },
    {
      question: "Do you have a physical store I can visit?",
      answer: "Yes! We welcome visitors to our main office and showroom. Please schedule an appointment in advance to ensure someone is available to assist you properly.",
    },
    {
      question: "Can I track my order status through this contact form?",
      answer: "For order tracking, please use your order number and email on our Track Order page. For specific order inquiries, you can contact us through this form or call our customer service.",
    },
    {
      question: "Do you provide bulk order quotes via this form?",
      answer: "For wholesale and bulk order inquiries, please use our dedicated Wholesale page for faster processing and detailed quotes from our wholesale team.",
    },
  ]

  return (
    <main>
      {/* Hero Section — navy prescription-counter band */}
      <section className="relative overflow-hidden bg-[image:var(--surface-hero)] py-20 text-[var(--paper)] md:py-28">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--mint-soft)]">
              Contact
            </p>
            <h1 className="mb-5 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-extrabold tracking-tight text-[var(--paper)]">
              Get in touch
            </h1>
            <p className="text-lg leading-relaxed text-[var(--ink-10)] md:text-xl">
              Questions about medicines, delivery, or a prescription? We&apos;re here to help —
              call, WhatsApp, or send a message and we&apos;ll reply within 24 hours.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 md:py-24 bg-[var(--paper-card)]">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <StaggerItem>
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)] text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--mint)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-[var(--ink)]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold font-display text-[var(--ink)] mb-2">Visit us</h3>
                <p className="text-sm text-[var(--ink-70)]">
                  {CONTACT.address.line1}<br />
                  {CONTACT.address.city}, {CONTACT.address.state}<br />
                  {CONTACT.address.postalCode}
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)] text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--mint)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-[var(--ink)]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold font-display text-[var(--ink)] mb-2">Call us</h3>
                <a href={CONTACT.phoneHref} className="text-sm text-[var(--ink-70)] hover:text-[var(--mint)] transition-colors block">
                  {CONTACT.phone}
                </a>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)] text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--mint)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-[var(--ink)]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold font-display text-[var(--ink)] mb-2">Email us</h3>
                <a href={CONTACT.emailHref} className="text-sm text-[var(--ink-70)] hover:text-[var(--mint)] transition-colors block">
                  {CONTACT.email}
                </a>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)] text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--mint)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-[var(--ink)]" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold font-display text-[var(--ink)] mb-2">Business hours</h3>
                <p className="text-sm text-[var(--ink-70)]">
                  {CONTACT.hours}
                </p>
              </div>
            </StaggerItem>
          </StaggerContainer>

          {/* Form and Map Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <AnimatedSection direction="left">
              <div className="bg-[var(--paper-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] p-8 md:p-10 border border-[var(--foil-soft)]">
                <h2 className="text-[length:var(--step-2)] font-bold font-display text-[var(--ink)] mb-2">Send us a message</h2>
                <p className="text-[var(--ink-70)] mb-8">We&apos;ll get back to you within 24 hours.</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <FormField label="Your name" required error={errors.name?.message}>
                    <Input {...register("name")} placeholder="John Doe" error={errors.name?.message} />
                  </FormField>

                  <FormField label="Email address" required error={errors.email?.message}>
                    <Input {...register("email")} type="email" placeholder="john@example.com" error={errors.email?.message} />
                  </FormField>

                  <FormField label="Phone number" required error={errors.phone?.message}>
                    <PhoneInput {...register("phone")} placeholder="+91 XXXXX XXXXX" error={errors.phone?.message} />
                  </FormField>

                  <FormField label="Subject" required error={errors.subject?.message}>
                    <Input {...register("subject")} placeholder="How can we help you?" error={errors.subject?.message} />
                  </FormField>

                  <FormField label="Message" required error={errors.message?.message}>
                    <Textarea
                      {...register("message")}
                      placeholder="Tell us more about your inquiry..."
                      error={errors.message?.message}
                      className="min-h-[150px]"
                    />
                  </FormField>

                  {submitStatus === "success" && (
                    <div className="bg-[var(--mint-soft)] border-2 border-[var(--mint)] text-[var(--mint)] p-4 rounded-[var(--radius-md)] flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Message sent!</p>
                        <p className="text-sm">We&apos;ll get back to you within 24 hours.</p>
                      </div>
                    </div>
                  )}

                  {submitStatus === "error" && (
                    <div className="bg-[var(--foil-soft)] border-2 border-[var(--ink)] text-[var(--ink)] p-4 rounded-[var(--radius-md)]">
                      <p className="font-semibold">Error sending message</p>
                      <p className="text-sm">Please try again or contact us directly.</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[var(--ink)] hover:bg-[var(--ink-deep)] text-[var(--paper-card)] py-3 text-base font-semibold shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)]"
                  >
                    {isSubmitting ? 'Sending…' : 'Send message'}
                  </Button>
                </form>
              </div>
            </AnimatedSection>

            {/* Map and Additional Info */}
            <AnimatedSection direction="right" className="space-y-8">
              {/* Map */}
              <div className="bg-[var(--paper-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] overflow-hidden h-[400px] border border-[var(--foil-soft)]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7216.297745776706!2d77.4063272!3d23.1859041!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x397c5cae0000001%3A0xbe6d4e7d7d7d7d7d!2sBhopal%2C%20Madhya%20Pradesh%20462041!5e0!3m2!1sen!2sin!4v1762940168403"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="PM Store location — Bhopal"
                ></iframe>
              </div>

              {/* Quick Contact Options */}
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
                <h3 className="text-[length:var(--step-1)] font-bold font-display text-[var(--ink)] mb-6">Quick contact</h3>
                <div className="space-y-3">
                  <a
                    href={CONTACT.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-[var(--paper-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] border border-[var(--foil-soft)]"
                  >
                    <div className="w-12 h-12 bg-[var(--mint)] rounded-full flex items-center justify-center shrink-0">
                      <MessageCircle className="w-6 h-6 text-[var(--ink)]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold font-display text-[var(--ink)]">WhatsApp</p>
                      <p className="text-sm text-[var(--ink-70)]">Chat with us instantly</p>
                    </div>
                  </a>

                  <a
                    href={CONTACT.phoneHref}
                    className="flex items-center gap-4 p-4 bg-[var(--paper-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] border border-[var(--foil-soft)]"
                  >
                    <div className="w-12 h-12 bg-[var(--mint)] rounded-full flex items-center justify-center shrink-0">
                      <Phone className="w-6 h-6 text-[var(--ink)]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold font-display text-[var(--ink)]">Call now</p>
                      <p className="text-sm text-[var(--ink-70)]">{CONTACT.phone}</p>
                    </div>
                  </a>

                  <a
                    href={CONTACT.emailHref}
                    className="flex items-center gap-4 p-4 bg-[var(--paper-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] border border-[var(--foil-soft)]"
                  >
                    <div className="w-12 h-12 bg-[var(--mint)] rounded-full flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-[var(--ink)]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-semibold font-display text-[var(--ink)]">Email us</p>
                      <p className="text-sm text-[var(--ink-70)]">{CONTACT.email}</p>
                    </div>
                  </a>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>


      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-[var(--paper-card)]">
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-[length:var(--step-2)] mb-4 text-[var(--ink)]">
              Frequently asked questions
            </h2>
            <p className="text-[var(--ink-70)] max-w-2xl mx-auto">
              Quick answers to help you get started.
            </p>
          </AnimatedSection>

          <AnimatedSection direction="up" className="max-w-4xl mx-auto">
            <FAQAccordion items={faqItems} />
          </AnimatedSection>
        </div>
      </section>
    </main>
  )
}
