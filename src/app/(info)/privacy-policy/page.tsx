"use client"

import React from "react"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { Shield, Database, UserCheck, Eye, Lock, Mail } from "lucide-react"

export default function PrivacyPolicyPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-red-50 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-gray-900">
              Privacy
              <span className="block bg-gradient-to-r from-amber-600 to-red-700 bg-clip-text text-transparent">
                Policy
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-4">
              Your privacy is important to us
            </p>
            <p className="text-base text-gray-600">
              Last Updated: December 2025
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <AnimatedSection direction="up" className="space-y-8">
            {/* Introduction */}
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-8 shadow-lg">
              <p className="text-gray-700 leading-relaxed">
                PMStore (PMSTORE™) respects customer privacy and is committed to protecting personal information shared with us.
              </p>
            </div>

            {/* Information We Collect */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Information We Collect</h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    We may collect:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Name, phone number, email address</li>
                    <li>• Billing and shipping address</li>
                    <li>• Order and transaction details</li>
                    <li>• Website usage data for analytics and improvement</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Use of Information */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Use of Information</h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Customer information is used for:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Order processing and delivery</li>
                    <li>• Customer support and communication</li>
                    <li>• Improving website functionality and services</li>
                    <li>• Legal and regulatory compliance</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Data Protection & Security */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Data Protection & Security</h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    We take strict security measures to protect customer data:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Secure and encrypted servers</li>
                    <li>• Trusted and licensed software</li>
                    <li>• Restricted internal access</li>
                    <li>• Regular system monitoring</li>
                  </ul>
                  <p className="text-gray-700 leading-relaxed mt-4">
                    We ensure that customer data is protected from unauthorized access, data leakage, misuse, or loss.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Sharing */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Data Sharing</h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Customer data is never sold, rented, or shared with any third party.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Data may be shared only with trusted service providers (payment gateways, courier partners) strictly for order fulfillment purposes.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Gateway Security */}
            <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Payment Gateway Security</h2>
              <div className="space-y-3 text-gray-700">
                <p className="leading-relaxed">
                  We use trusted, secure, and PCI-DSS compliant payment gateways.
                </p>
                <p className="leading-relaxed">
                  PMStore does not store or process any debit card, credit card, UPI, or net-banking details.
                </p>
                <p className="leading-relaxed">
                  All payment transactions are encrypted and handled directly by the payment gateway provider.
                </p>
                <p className="leading-relaxed">
                  PMStore shall not be liable for any technical or operational issues arising from the payment gateway or banking institutions.
                </p>
              </div>
            </div>

            {/* Customer Consent */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Customer Consent</h2>
              <p className="text-gray-700 leading-relaxed">
                By using our website and placing an order, customers consent to this Privacy Policy.
              </p>
            </div>

            {/* Policy Updates */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Policy Updates</h2>
              <p className="text-gray-700 leading-relaxed">
                This Privacy Policy may be updated from time to time. Updates will be reflected on our website.
              </p>
            </div>

            {/* Contact Information */}
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Contact Information</h2>
                  <div className="space-y-2 text-gray-700">
                    <p><strong>PMStore (PMSTORE™)</strong></p>
                    <p>📍 Goula, Tehsil Multai, District Betul, Madhya Pradesh – 460557</p>
                    <p>📧 Email: pmstoremedicine@gmail.com</p>
                    <p>📞 Phone: +91-9770355137</p>
                    <p>🌐 Website: www.pratigyamedicalstore.com</p>
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