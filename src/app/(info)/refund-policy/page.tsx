"use client"

import React from "react"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { RefreshCcw, AlertCircle, PackageCheck, Phone, Mail, Camera } from "lucide-react"

export default function ReturnPolicyPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-red-50 py-20 md:py-32">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCcw className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-gray-900">
              Return & Refund
              <span className="block bg-gradient-to-r from-amber-600 to-red-700 bg-clip-text text-transparent">
                Policy
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-4">
              Quality products with hassle-free replacements
            </p>
            <p className="text-base text-gray-600">
              Last Updated: December 2025
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Policy Content */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <AnimatedSection direction="up" className="space-y-8">
            {/* Introduction */}
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-8 shadow-lg">
              <p className="text-gray-700 leading-relaxed">
                PMStore is committed to providing high-quality, hygienically packed food products. Due to the nature of consumable goods, please read this policy carefully before placing an order.
              </p>
            </div>

            {/* Non-Returnable Products */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Non-Returnable Products</h2>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    All food and consumable products sold on our website are non-returnable once delivered, due to hygiene and safety reasons, except in the following cases:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Wrong product delivered</li>
                    <li>• Product received in damaged condition</li>
                    <li>• Manufacturing defect</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Wrong/Damaged/Defective Product */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <PackageCheck className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Wrong / Damaged / Defective Product</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    If a customer receives a wrong, damaged, or defective product, the issue must be reported within <strong>48 hours of delivery</strong>.
                  </p>
                  
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">How to Raise a Complaint</h3>
                  <p className="text-gray-700 leading-relaxed mb-3">
                    Customers may contact us via:
                  </p>
                  <div className="space-y-2 text-gray-700 mb-4">
                    <p>📞 Helpline: +91-9770355137</p>
                    <p>📧 Email: pmstoremedicine@gmail.com</p>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-6 border-l-4 border-amber-500">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <Camera className="w-5 h-5" />
                      Required Evidence
                    </h4>
                    <p className="text-gray-700 leading-relaxed mb-2">
                      The customer must provide:
                    </p>
                    <ul className="space-y-1 text-gray-700">
                      <li>• Clear photographs of the product</li>
                      <li>• Unboxing or delivery-receiving video</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-3 text-sm">
                      <strong>Note:</strong> Requests without proper photographic or video evidence may be rejected.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Replacement or Refund */}
            <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Replacement or Refund</h2>
              <div className="space-y-3 text-gray-700">
                <p className="leading-relaxed">
                  After verification of the submitted proof, the complaint will be reviewed.
                </p>
                <p className="leading-relaxed">
                  ✓ If the product is available, a <strong>replacement product</strong> will be dispatched free of cost.
                </p>
                <p className="leading-relaxed">
                  ✓ If the product is not available, a <strong>full refund</strong> will be processed.
                </p>
                <p className="leading-relaxed">
                  Refunds will be issued to the original payment method within <strong>7–10 working days</strong> after approval.
                </p>
              </div>
            </div>

            {/* Order Cancellation */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Order Cancellation</h2>
              <div className="text-gray-700 space-y-2">
                <p className="leading-relaxed">
                  • Orders can be cancelled only <strong>before dispatch</strong>
                </p>
                <p className="leading-relaxed">
                  • Once dispatched, cancellations will not be accepted
                </p>
              </div>
            </div>

            {/* Shipping Charges */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Shipping Charges</h2>
              <div className="text-gray-700 space-y-2">
                <p className="leading-relaxed">
                  • Shipping charges are <strong>non-refundable</strong>
                </p>
                <p className="leading-relaxed">
                  • In case of an error from PMStore, shipping costs will be borne by the company
                </p>
              </div>
            </div>

            {/* Company Rights */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Company Rights</h2>
              <p className="text-gray-700 leading-relaxed">
                PMStore reserves the right to:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li>• Reject claims without valid proof</li>
                <li>• Modify this policy at any time without prior notice</li>
              </ul>
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