"use client"

import React from "react"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { FileText, ShoppingCart, CreditCard, Package, Scale, Mail } from "lucide-react"

export default function TermsConditionsPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-red-50 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-gray-900">
              Terms &
              <span className="block bg-gradient-to-r from-amber-600 to-red-700 bg-clip-text text-transparent">
                Conditions
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-4">
              Please read these terms carefully
            </p>
            <p className="text-base text-gray-600">
              Last Updated: December 2025
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <AnimatedSection direction="up" className="space-y-8">
            {/* Introduction */}
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-8 shadow-lg">
              <p className="text-gray-700 leading-relaxed">
                By accessing or using <strong>www.pratigyamedicalstore.com</strong>, you agree to the following terms and conditions. Please read them carefully before placing an order.
              </p>
            </div>

            {/* General */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">General</h2>
                  <ul className="space-y-2 text-gray-700">
                    <li>• All products are intended for personal consumption, unless otherwise stated</li>
                    <li>• Prices, availability, and offers may change without prior notice</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Product Information */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Product Information</h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    We strive to provide accurate product descriptions.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Minor variations in color, texture, weight, or packaging may occur due to natural or processing factors.
                  </p>
                </div>
              </div>
            </div>

            {/* Orders & Payments */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Orders & Payments</h2>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Orders are confirmed only after successful payment</li>
                    <li>• We reserve the right to cancel orders due to stock issues, pricing errors, or suspicious activity</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Payment Gateway Disclaimer */}
            <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Payment Gateway Disclaimer</h2>
                  <div className="space-y-3 text-gray-700">
                    <p className="leading-relaxed">
                      All payments are processed through secure and trusted third-party payment gateways.
                    </p>
                    <p className="leading-relaxed">
                      PMStore does not have access to customer payment credentials.
                    </p>
                    <p className="leading-relaxed">
                      Transaction delays, failures, or refunds are subject to the policies of the respective banks and payment gateway providers.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping & Delivery */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Shipping & Delivery</h2>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Delivery timelines are estimated and may vary due to logistics partners or unforeseen circumstances</li>
                    <li>• PMStore is not liable for courier-related delays</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Intellectual Property */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">
                All website content, logos, images, and branding are the exclusive property of PMStore and may not be used without written permission.
              </p>
            </div>

            {/* Limitation of Liability */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                PMStore shall not be liable for:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li>• Indirect or consequential damages</li>
                <li>• Personal taste preferences</li>
                <li>• Improper storage or misuse of products</li>
              </ul>
            </div>

            {/* Governing Law */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Scale className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Governing Law</h2>
                  <p className="text-gray-700 leading-relaxed">
                    These terms shall be governed by the laws of India, and courts located in Madhya Pradesh shall have exclusive jurisdiction.
                  </p>
                </div>
              </div>
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
                    <p>📧 Email: taptiagrofood@gmail.com</p>
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