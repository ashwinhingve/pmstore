"use client"

import React from "react"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { Truck, MapPin, Clock, Package, Phone, Mail, IndianRupee, AlertCircle } from "lucide-react"

export default function ShippingPolicyPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-red-50 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-gray-900">
              Shipping
              <span className="block bg-gradient-to-r from-amber-600 to-red-700 bg-clip-text text-transparent">
                Policy
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-4">
              Fast, reliable delivery across India
            </p>
            <p className="text-base text-gray-600">
              Last Updated: February 2026
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="space-y-12">
            {/* Delivery Coverage */}
            <AnimatedSection direction="up">
              <div className="bg-gradient-to-br from-amber-50 to-red-50 rounded-2xl p-8 border border-amber-100">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-6 h-6 text-amber-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Delivery Coverage</h2>
                </div>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-1">-</span>
                    We deliver across India through our logistics partner <strong>Delhivery</strong>.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-1">-</span>
                    Delivery availability is based on PIN code serviceability. You can check if your area is serviceable during checkout.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-1">-</span>
                    We currently do not ship internationally.
                  </li>
                </ul>
              </div>
            </AnimatedSection>

            {/* Delivery Timeline */}
            <AnimatedSection direction="up">
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-amber-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Estimated Delivery Time</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                    <h3 className="font-semibold text-green-800 mb-2">Metro Cities</h3>
                    <p className="text-3xl font-bold text-green-700">3-5</p>
                    <p className="text-sm text-green-600">business days</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                    <h3 className="font-semibold text-blue-800 mb-2">Other Locations</h3>
                    <p className="text-3xl font-bold text-blue-700">5-7</p>
                    <p className="text-sm text-blue-600">business days</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Delivery times are estimates and may vary depending on location, weather conditions, and public holidays. Orders placed after 2:00 PM IST will be processed the next business day.
                </p>
              </div>
            </AnimatedSection>

            {/* Shipping Charges */}
            <AnimatedSection direction="up">
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <IndianRupee className="w-6 h-6 text-amber-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Shipping Charges</h2>
                </div>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-1">-</span>
                    Shipping charges are calculated at checkout based on order weight and destination.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-1">-</span>
                    <strong>Free shipping</strong> is available on orders above a certain amount (displayed at checkout).
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-1">-</span>
                    All prices displayed on the website are inclusive of applicable taxes.
                  </li>
                </ul>
              </div>
            </AnimatedSection>

            {/* Order Processing */}
            <AnimatedSection direction="up">
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Package className="w-6 h-6 text-amber-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Order Processing</h2>
                </div>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-1">1.</span>
                    Once your payment is confirmed, we begin processing your order immediately.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-1">2.</span>
                    A shipment is automatically created with Delhivery and you receive a tracking number via email/SMS.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-1">3.</span>
                    You can track your order in real-time from your account under &quot;My Orders&quot;.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold mt-1">4.</span>
                    An invoice is generated and available for download from your order details page.
                  </li>
                </ul>
              </div>
            </AnimatedSection>

            {/* Important Notes */}
            <AnimatedSection direction="up">
              <div className="bg-yellow-50 rounded-2xl p-8 border border-yellow-200">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Important Notes</h2>
                </div>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 font-bold mt-1">-</span>
                    Please ensure someone is available at the delivery address to receive the package.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 font-bold mt-1">-</span>
                    If a delivery attempt fails, the courier will make up to 2 additional attempts before returning the package.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 font-bold mt-1">-</span>
                    Our products are food items and are packaged to maintain freshness during transit.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-600 font-bold mt-1">-</span>
                    In case of any damage during shipping, please contact us within 24 hours of delivery with photos of the damaged package.
                  </li>
                </ul>
              </div>
            </AnimatedSection>

            {/* Contact */}
            <AnimatedSection direction="up">
              <div className="bg-gradient-to-r from-amber-600 to-red-700 rounded-2xl p-8 text-white">
                <h2 className="text-2xl font-bold mb-4">Questions About Shipping?</h2>
                <p className="text-amber-100 mb-6">
                  Our customer support team is happy to help with any shipping-related queries.
                </p>
                <div className="flex flex-wrap gap-6">
                  <a href="mailto:support@taptifs.com" className="flex items-center gap-2 text-white hover:text-amber-200 transition">
                    <Mail className="w-5 h-5" />
                    support@taptifs.com
                  </a>
                  <a href="tel:+919329216544" className="flex items-center gap-2 text-white hover:text-amber-200 transition">
                    <Phone className="w-5 h-5" />
                    +91 93292 16544
                  </a>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </main>
  )
}
