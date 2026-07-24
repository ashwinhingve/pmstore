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
      console.log("Submitting contact form:", data)
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      console.log("API Response:", result)

      if (response.ok) {
        console.log("✓ Contact form submitted successfully")
        setSubmitStatus("success")
        reset()
      } else {
        console.error("❌ Error submitting contact form:", result)
        setSubmitStatus("error")
      }
    } catch (error) {
      console.error("❌ Network error:", error)
      setSubmitStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const faqItems = [
    {
      question: "What are your business hours?",
      answer: "We're open Monday to Saturday from 9:00 AM to 6:00 PM IST. We're closed on Sundays and national holidays. However, you can reach us via email 24/7, and we'll respond within 24 hours.",
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
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[var(--paper)] py-20 md:py-32">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto">
            <h1 className="text-[length:var(--step-3)] mb-6 text-[var(--ink)]">
              Get In Touch
            </h1>
            <p className="text-xl md:text-2xl text-[var(--ink-70)] mb-8">
              Have questions about medicines, delivery, or prescriptions? We're here to help!
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 md:py-24 bg-[var(--paper-card)]">
        <div className="container mx-auto px-4">
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <StaggerItem>
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-card)] hover:shadow-lg transition-all duration-300 group hover:scale-105 text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--mint)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <MapPin className="w-8 h-8 text-[var(--ink)]" />
                </div>
                <h3 className="text-lg font-bold font-display text-[var(--ink)] mb-2">Visit Us</h3>
                <p className="text-sm text-[var(--ink-70)]">
                  {CONTACT.address.line1}<br />
                  {CONTACT.address.city}, {CONTACT.address.state}<br />
                  {CONTACT.address.postalCode}
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-card)] hover:shadow-lg transition-all duration-300 group hover:scale-105 text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--mint)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Phone className="w-8 h-8 text-[var(--ink)]" />
                </div>
                <h3 className="text-lg font-bold font-display text-[var(--ink)] mb-2">Call Us</h3>
                <a href={CONTACT.phoneHref} className="text-sm text-[var(--ink-70)] hover:text-[var(--mint)] transition-colors block">
                  {CONTACT.phone}
                </a>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-card)] hover:shadow-lg transition-all duration-300 group hover:scale-105 text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--mint)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Mail className="w-8 h-8 text-[var(--ink)]" />
                </div>
                <h3 className="text-lg font-bold font-display text-[var(--ink)] mb-2">Email Us</h3>
                <a href={CONTACT.emailHref} className="text-sm text-[var(--ink-70)] hover:text-[var(--mint)] transition-colors block">
                  {CONTACT.email}
                </a>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-card)] hover:shadow-lg transition-all duration-300 group hover:scale-105 text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--mint)] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Clock className="w-8 h-8 text-[var(--ink)]" />
                </div>
                <h3 className="text-lg font-bold font-display text-[var(--ink)] mb-2">Business Hours</h3>
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
              <div className="bg-[var(--paper-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-card)] p-8 md:p-10 border border-[var(--foil-soft)]">
                <h2 className="text-3xl font-bold font-display text-[var(--ink)] mb-2">Send Us a Message</h2>
                <p className="text-[var(--ink-70)] mb-8">Fill out the form and we'll get back to you within 24 hours.</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <FormField label="Your Name" required error={errors.name?.message}>
                    <Input {...register("name")} placeholder="John Doe" error={errors.name?.message} />
                  </FormField>

                  <FormField label="Email Address" required error={errors.email?.message}>
                    <Input {...register("email")} type="email" placeholder="john@example.com" error={errors.email?.message} />
                  </FormField>

                  <FormField label="Phone Number" required error={errors.phone?.message}>
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
                        <p className="text-sm">We'll get back to you within 24 hours.</p>
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
                    className="w-full bg-[var(--ink)] hover:bg-[var(--ink-70)] text-white py-6 text-lg font-semibold shadow-[var(--shadow-card)] hover:shadow-lg transition-all duration-300"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </div>
            </AnimatedSection>

            {/* Map and Additional Info */}
            <AnimatedSection direction="right" className="space-y-8">
              {/* Map */}
              <div className="bg-[var(--paper-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-card)] overflow-hidden h-[400px] border border-[var(--foil-soft)]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7216.297745776706!2d77.4063272!3d23.1859041!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x397c5cae0000001%3A0xbe6d4e7d7d7d7d7d!2sBhopal%2C%20Madhya%20Pradesh%20462041!5e0!3m2!1sen!2sin!4v1762940168403"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Pratigya Medical Store Location — Bhopal"
                ></iframe>
              </div>

              {/* Quick Contact Options */}
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-card)] border border-[var(--foil-soft)]">
                <h3 className="text-2xl font-bold font-display text-[var(--ink)] mb-6">Quick Contact</h3>
                <div className="space-y-4">
                  <a
                    href={CONTACT.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 bg-[var(--paper-card)] rounded-[var(--radius-md)] hover:shadow-md transition-all duration-300 group border border-[var(--foil-soft)]"
                  >
                    <div className="w-12 h-12 bg-[var(--mint)] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <MessageCircle className="w-6 h-6 text-[var(--ink)]" />
                    </div>
                    <div>
                      <p className="font-semibold font-display text-[var(--ink)]">WhatsApp</p>
                      <p className="text-sm text-[var(--ink-70)]">Chat with us instantly</p>
                    </div>
                  </a>

                  <a
                    href={CONTACT.phoneHref}
                    className="flex items-center gap-4 p-4 bg-[var(--paper-card)] rounded-[var(--radius-md)] hover:shadow-md transition-all duration-300 group border border-[var(--foil-soft)]"
                  >
                    <div className="w-12 h-12 bg-[var(--mint)] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Phone className="w-6 h-6 text-[var(--ink)]" />
                    </div>
                    <div>
                      <p className="font-semibold font-display text-[var(--ink)]">Call Now</p>
                      <p className="text-sm text-[var(--ink-70)]">{CONTACT.phone}</p>
                    </div>
                  </a>

                  <a
                    href={CONTACT.emailHref}
                    className="flex items-center gap-4 p-4 bg-[var(--paper-card)] rounded-[var(--radius-md)] hover:shadow-md transition-all duration-300 group border border-[var(--foil-soft)]"
                  >
                    <div className="w-12 h-12 bg-[var(--mint)] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Mail className="w-6 h-6 text-[var(--ink)]" />
                    </div>
                    <div>
                      <p className="font-semibold font-display text-[var(--ink)]">Email Us</p>
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
        <div className="container mx-auto px-4">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-[length:var(--step-2)] mb-2 text-[var(--ink)]">
              Frequently Asked Questions
            </h2>
            <div className="w-24 h-1 bg-[var(--mint)] mx-auto mt-4"></div>
          </AnimatedSection>

          <AnimatedSection direction="up" className="max-w-4xl mx-auto">
            <FAQAccordion items={faqItems} />
          </AnimatedSection>
        </div>
      </section>
    </main>
  )
}
