"use client"

import React from "react"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { SITE_NAME, CONTACT, SITE_URL } from "@/lib/constants"
import { FileText, ShoppingCart, CreditCard, Package, Scale, Mail } from "lucide-react"

export default function TermsConditionsPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[var(--paper)] py-20 md:py-32">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-[var(--mint)] rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-[var(--ink)]" />
            </div>
            <h1 className="text-[length:var(--step-3)] mb-6 text-[var(--ink)]">
              Terms & Conditions
            </h1>
            <p className="text-xl md:text-2xl text-[var(--ink-70)] mb-4">
              Please read these terms carefully
            </p>
            <p className="text-base text-[var(--ink-40)]">
              Last Updated: February 2026
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-16 md:py-24 bg-[var(--paper-card)]">
        <div className="container mx-auto px-4 max-w-4xl">
          <AnimatedSection direction="up" className="space-y-8">
            {/* Introduction */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-card)] border border-[var(--foil-soft)]">
              <p className="text-[var(--ink)] leading-relaxed">
                By accessing or using <strong>{SITE_URL}</strong>, you agree to these terms and conditions. Please read them carefully before placing an order.
              </p>
            </div>

            {/* General */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--mint)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-[var(--ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">General</h2>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• All medicines and products are for personal use unless otherwise stated</li>
                    <li>• Prices, availability, and offers may change without prior notice</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Product Information */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--mint)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-[var(--ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Product Information</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    We provide accurate medicine descriptions with composition, strength, and unit pricing.
                  </p>
                  <p className="text-[var(--ink)] leading-relaxed">
                    Packaging may vary by manufacturer. All medicines are sourced from licensed distributors.
                  </p>
                </div>
              </div>
            </div>

            {/* Orders & Payments */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--mint)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-6 h-6 text-[var(--ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Orders & Payments</h2>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• Orders are confirmed only after successful payment</li>
                    <li>• We reserve the right to cancel orders due to stock issues or suspicious activity</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Payment Gateway Disclaimer */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-card)] border border-[var(--foil-soft)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--mint)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-[var(--ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-4">Payment Gateway Disclaimer</h2>
                  <div className="space-y-3 text-[var(--ink)]">
                    <p className="leading-relaxed">
                      All payments are processed through secure, PCI-DSS compliant payment gateways.
                    </p>
                    <p className="leading-relaxed">
                      {SITE_NAME} does not have access to customer payment credentials.
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
                <div className="w-12 h-12 bg-[var(--mint)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-[var(--ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Shipping & Delivery</h2>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• Delivery timelines are estimated and may vary due to logistics or unforeseen circumstances</li>
                    <li>• {SITE_NAME} is not liable for courier-related delays</li>
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
                {SITE_NAME} shall not be liable for:
              </p>
              <ul className="space-y-2 text-[var(--ink)]">
                <li>• Indirect or consequential damages</li>
                <li>• Improper storage or misuse of medicines</li>
                <li>• Adverse reactions (consult your doctor before use)</li>
              </ul>
            </div>

            {/* Governing Law */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--mint)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Scale className="w-6 h-6 text-[var(--ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Governing Law</h2>
                  <p className="text-[var(--ink)] leading-relaxed">
                    These terms are governed by the laws of India. Courts in Madhya Pradesh have exclusive jurisdiction.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-card)] border border-[var(--foil-soft)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--mint)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-[var(--ink)]" />
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