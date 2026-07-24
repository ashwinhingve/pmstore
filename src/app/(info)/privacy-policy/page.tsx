"use client"

import React from "react"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { SITE_NAME, CONTACT, SITE_URL } from "@/lib/constants"
import { Shield, Database, UserCheck, Eye, Lock, Mail } from "lucide-react"

export default function PrivacyPolicyPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[var(--paper)] py-20 md:py-32">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-[var(--mint)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-[var(--ink)]" />
            </div>
            <h1 className="text-[length:var(--step-3)] mb-6 text-[var(--ink)]">
              Privacy Policy
            </h1>
            <p className="text-xl md:text-2xl text-[var(--ink-70)] mb-4">
              Your privacy is important to us
            </p>
            <p className="text-base text-[var(--ink-40)]">
              Last Updated: February 2026
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="py-16 md:py-24 bg-[var(--paper-card)]">
        <div className="container mx-auto px-4 max-w-4xl">
          <AnimatedSection direction="up" className="space-y-8">
            {/* Introduction */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-card)] border border-[var(--foil-soft)]">
              <p className="text-[var(--ink)] leading-relaxed">
                {SITE_NAME} respects customer privacy and is committed to protecting personal information shared with us. We never log prescription image URLs, phone numbers, or full addresses.
              </p>
            </div>

            {/* Information We Collect */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--mint)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Database className="w-6 h-6 text-[var(--ink)]" />
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
                    <li>• Website usage data for analytics</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Use of Information */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--mint)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-6 h-6 text-[var(--ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Use of Information</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    Customer information is used for:
                  </p>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• Order processing and delivery</li>
                    <li>• Customer support and communication</li>
                    <li>• Prescription verification</li>
                    <li>• Legal and regulatory compliance</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Protection & Security */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--mint)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-[var(--ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Data Protection & Security</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    We take strict security measures to protect customer data:
                  </p>
                  <ul className="space-y-2 text-[var(--ink)]">
                    <li>• Secure and encrypted servers</li>
                    <li>• Restricted internal access</li>
                    <li>• Regular system monitoring</li>
                    <li>• PCI-DSS compliance</li>
                  </ul>
                  <p className="text-[var(--ink)] leading-relaxed mt-4">
                    We protect customer data from unauthorized access, leakage, misuse, or loss.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Sharing */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[var(--mint)] rounded-[var(--radius-sm)] flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-[var(--ink)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-3">Data Sharing</h2>
                  <p className="text-[var(--ink)] leading-relaxed mb-3">
                    Customer data is never sold, rented, or shared with any third party.
                  </p>
                  <p className="text-[var(--ink)] leading-relaxed">
                    Data may be shared only with trusted service providers (payment gateways, courier partners) for order fulfillment purposes.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Gateway Security */}
            <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-card)] border border-[var(--foil-soft)]">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)] mb-4">Payment Gateway Security</h2>
              <div className="space-y-3 text-[var(--ink)]">
                <p className="leading-relaxed">
                  We use trusted, secure, and PCI-DSS compliant payment gateways.
                </p>
                <p className="leading-relaxed">
                  {SITE_NAME} does not store or process any card, UPI, or net-banking details.
                </p>
                <p className="leading-relaxed">
                  All payment transactions are encrypted and handled directly by the payment provider.
                </p>
              </div>
            </div>

            {/* Customer Consent */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Customer Consent</h2>
              <p className="text-[var(--ink)] leading-relaxed">
                By using our website and placing an order, customers consent to this Privacy Policy.
              </p>
            </div>

            {/* Policy Updates */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-[var(--ink)]">Policy Updates</h2>
              <p className="text-[var(--ink)] leading-relaxed">
                This Privacy Policy may be updated from time to time. Updates will be reflected on our website.
              </p>
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