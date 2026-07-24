"use client"

import React, { useEffect, useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useCartStore, cartItemKey } from "@/store/useCartStore"
import type { AppliedDiscount } from "@/store/useCartStore"
import { Button } from "@/components/ui/button"
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/shared/AnimatedSection"
import {
  Trash2, Plus, Minus, ShoppingBag, ArrowRight, Package,
  Tag, X, CheckCircle, Loader2, Gift, Pill,
} from "lucide-react"
import { motion } from "framer-motion"
import { RxBadge } from "@/components/shared/RxBadge"
import { extractGST } from "@/lib/gst"
import { perUnitLabel, formatINR } from "@/lib/pharma/format"

export default function CartPage() {
  const { data: session } = useSession()
  const {
    items, updateQuantity, removeItem, getTotalPrice, getTotalItems, clearCart,
    discount, setDiscount, clearDiscount, getDiscountAmount,
  } = useCartStore()

  const [couponInput, setCouponInput] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState("")
  const [autoChecking, setAutoChecking] = useState(false)
  const checkedRef = useRef(false)

  const totalPrice = getTotalPrice()
  const totalItems = getTotalItems()
  const shipping = totalPrice >= 500 ? 0 : 30
  const discountAmt = getDiscountAmount()
  // Prices are GST-inclusive (MRP) — no separate tax added
  const finalTotal = Math.max(0, totalPrice + shipping - discountAmt)

  const hasRxItems = items.some((i) => i.product.prescriptionRequired)
  // GST already sits inside the inclusive prices; show how much, for clarity.
  // The CGST/SGST vs IGST split needs the delivery state, so that's shown at
  // checkout — here we surface the state-independent total only.
  const gstIncluded = Math.round(
    items.reduce(
      (sum, i) => sum + extractGST(i.product.price, i.product.gstRate ?? 5).gst * i.quantity,
      0,
    ) * 100,
  ) / 100

  // ── Auto-check for applicable discounts on mount ─────────────
  useEffect(() => {
    if (checkedRef.current || items.length === 0) return
    checkedRef.current = true

    async function checkAuto() {
      setAutoChecking(true)
      try {
        const res = await fetch("/api/discount/check")
        const data = await res.json()
        if (!res.ok || !data.discounts?.length) return

        // Pick the best auto discount (highest computed amount)
        const best = data.discounts.reduce((prev: any, cur: any) => {
          const amt = (d: any) =>
            d.discountType === "fixed"
              ? d.discountValue
              : (totalPrice * d.discountValue) / 100
          return amt(cur) > amt(prev) ? cur : prev
        }, data.discounts[0])

        // Only auto-apply if no discount already set, or if this one is better
        const currentAmt = discountAmt
        const newAmt =
          best.discountType === "fixed"
            ? best.discountValue
            : (totalPrice * best.discountValue) / 100

        if (!discount || newAmt > currentAmt) {
          setDiscount(best as AppliedDiscount)
        }
      } catch {
        // Silently fail auto-check
      } finally {
        setAutoChecking(false)
      }
    }
    checkAuto()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  // ── Validate coupon code ──────────────────────────────────────
  async function handleApplyCoupon() {
    if (!couponInput.trim()) return
    if (!session) {
      setCouponError("Please log in to apply a coupon")
      return
    }
    setCouponLoading(true)
    setCouponError("")
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), subtotal: totalPrice }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCouponError(data.error || "Invalid coupon")
        return
      }
      setDiscount(data.discount as AppliedDiscount)
      setCouponInput("")
    } catch {
      setCouponError("Failed to validate coupon. Try again.")
    } finally {
      setCouponLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--paper)] py-16">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up">
            <div className="max-w-2xl mx-auto text-center py-20 bg-[var(--paper-card)] rounded-2xl shadow-card">
              <div className="w-32 h-32 mx-auto mb-6 bg-[var(--mint-soft)] rounded-full flex items-center justify-center">
                <ShoppingBag className="w-16 h-16 text-[var(--mint)]" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-[var(--ink)]">Your Cart is Empty</h1>
              <p className="text-[var(--ink-70)] mb-8 text-lg">
                Looks like you haven&apos;t added any items to your cart yet. Start shopping to fill it up!
              </p>
              <Link href="/products">
                <Button
                  size="lg"
                  className="bg-[var(--mint)] hover:opacity-90 text-[var(--paper-card)] px-10 py-6 text-lg"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Browse Products
                </Button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {/* Hero Section */}
      <section className="bg-[var(--paper)] py-12 md:py-16 border-b border-[var(--foil-soft)]">
        <div className="container mx-auto px-4">
          <AnimatedSection direction="up" className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-[var(--ink)]">
              Shopping
              <span className="block text-[var(--ink)]">
                Cart
              </span>
            </h1>
            <p className="text-lg md:text-xl text-[var(--ink-70)]">
              You have {totalItems} {totalItems === 1 ? "item" : "items"} in your cart
            </p>
          </AnimatedSection>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <AnimatedSection direction="left">
              <div className="bg-[var(--paper-card)] rounded-2xl shadow-card p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[var(--ink)]">Cart Items</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCart}
                    className="text-[var(--ink-70)] border-[var(--foil-soft)] hover:bg-[var(--foil-soft)]"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear Cart
                  </Button>
                </div>

                <StaggerContainer className="space-y-4">
                  {items.map((item) => (
                    <StaggerItem key={cartItemKey(item.product.id, item.product.variantId)}>
                      <motion.div
                        layout
                        className="flex flex-col sm:flex-row gap-4 p-4 bg-[var(--foil-soft)] rounded-xl hover:shadow-md transition-shadow"
                      >
                        {/* Product Image */}
                        <div className="w-full sm:w-32 h-32 flex-shrink-0 bg-[var(--paper-card)] rounded-lg overflow-hidden">
                          {(() => {
                            const img = item.product.images?.[0]
                            const imgUrl = typeof img === "string" ? img : img?.url
                            return imgUrl ? (
                              <Image
                                src={imgUrl}
                                alt={item.product.name}
                                width={128}
                                height={128}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[var(--foil-soft)]">
                                <svg className="w-12 h-12 text-[var(--ink-40)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            )
                          })()}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-bold text-lg text-[var(--ink)] mb-1">{item.product.name}</h3>
                              <p className="text-sm text-[var(--ink-70)]">
                                {typeof item.product.category === 'string'
                                  ? item.product.category
                                  : (item.product.category as any)?.name}
                              </p>
                              {item.product.prescriptionRequired && (
                                item.product.scheduleClass ? (
                                  <RxBadge scheduleClass={item.product.scheduleClass} className="mt-1.5" />
                                ) : (
                                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--rx-soft)] px-2.5 py-1 text-[0.8125rem] font-semibold text-[var(--rx)]">
                                    <Pill className="h-3.5 w-3.5" aria-hidden="true" />
                                    Prescription required
                                  </span>
                                )
                              )}
                              {item.product.packSize && item.product.packUnit && (
                                <p className="data mt-1 text-xs text-[var(--ink-70)]">
                                  Pack of {item.product.packSize} {item.product.packUnit}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => removeItem(cartItemKey(item.product.id, item.product.variantId))}
                              className="p-2 text-[var(--ink-70)] hover:bg-[var(--foil)] rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-[var(--ink)]">Quantity:</span>
                              <div className="flex items-center gap-2 bg-[var(--paper-card)] rounded-lg border-2 border-[var(--foil-soft)]">
                                <button
                                  onClick={() => updateQuantity(cartItemKey(item.product.id, item.product.variantId), item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="w-10 h-10 flex items-center justify-center text-[var(--ink-70)] hover:bg-[var(--foil-soft)] rounded-l-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-12 text-center font-bold text-[var(--ink)]">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(cartItemKey(item.product.id, item.product.variantId), item.quantity + 1)}
                                  className="w-10 h-10 flex items-center justify-center text-[var(--ink-70)] hover:bg-[var(--foil-soft)] rounded-r-lg transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="data text-sm text-[var(--ink-70)] mb-1">₹{item.product.price} × {item.quantity}</div>
                              {item.product.unitPrice && item.product.packUnit && (
                                <div className="data text-xs text-[var(--ink-70)]">
                                  {perUnitLabel(item.product.unitPrice, item.product.packUnit)}
                                </div>
                              )}
                              <div className="data text-xl font-bold text-[var(--mint)]">
                                ₹{(item.product.price * item.quantity).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>

              {/* ── Discounts Section ──────────────────────────────── */}
              <div className="bg-[var(--paper-card)] rounded-2xl shadow-card p-6 mb-6">
                <h2 className="text-lg font-bold text-[var(--ink)] mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[var(--mint)]" />
                  Discounts &amp; Coupons
                </h2>

                {/* Auto-applied discount banner */}
                {discount && (discount.type === "first_order" || discount.type === "auto") && (
                  <div className="flex items-start gap-3 p-3 bg-[var(--mint-soft)] border border-[var(--mint)] rounded-xl mb-4">
                    <Gift className="w-5 h-5 text-[var(--mint)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--ink)]">{discount.name}</p>
                      {discount.type === "first_order" && (
                        <p className="text-xs text-[var(--mint)] mt-0.5">Auto-applied — your first order bonus</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-[var(--mint)]">
                        -{discount.discountType === "fixed"
                          ? `₹${discount.discountValue}`
                          : `${discount.discountValue}%`}
                      </span>
                      <button
                        onClick={clearDiscount}
                        className="p-1 text-[var(--mint)] hover:opacity-80 rounded"
                        title="Remove discount"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Applied coupon code */}
                {discount && discount.type === "coupon" && (
                  <div className="flex items-start gap-3 p-3 bg-[var(--foil-soft)] border border-[var(--foil)] rounded-xl mb-4">
                    <CheckCircle className="w-5 h-5 text-[var(--mint)] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        Coupon <span className="font-mono bg-[var(--mint-soft)] px-1.5 py-0.5 rounded text-[var(--mint)]">{discount.code}</span> applied
                      </p>
                      <p className="text-xs text-[var(--ink-70)] mt-0.5">{discount.name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-[var(--mint)]">
                        -{discount.discountType === "fixed"
                          ? `₹${discount.discountValue}`
                          : `${discount.discountValue}%`}
                      </span>
                      <button
                        onClick={clearDiscount}
                        className="p-1 text-[var(--mint)] hover:opacity-80 rounded"
                        title="Remove coupon"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Auto-check spinner */}
                {autoChecking && !discount && (
                  <div className="flex items-center gap-2 text-sm text-[var(--ink-70)] mb-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking for available offers…
                  </div>
                )}

                {/* Coupon input — hide if a coupon is already applied */}
                {discount?.type !== "coupon" && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError("") }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                      placeholder="Enter coupon code"
                      className="flex-1 px-4 py-2.5 border-2 border-[var(--foil-soft)] rounded-xl text-sm font-mono uppercase text-[var(--ink)] placeholder:text-[var(--ink-40)]"
                      disabled={couponLoading}
                    />
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="bg-[var(--mint)] hover:opacity-90 text-[var(--paper-card)] px-5 rounded-xl"
                    >
                      {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
                {couponError && (
                  <p className="mt-2 text-sm text-[var(--ink-70)] flex items-center gap-1">
                    <X className="w-3.5 h-3.5" /> {couponError}
                  </p>
                )}
              </div>

              {/* Continue Shopping */}
              <Link href="/products">
                <Button variant="outline" className="w-full border-2 border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--foil-soft)]">
                  Continue Shopping
                </Button>
              </Link>
            </AnimatedSection>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <AnimatedSection direction="right">
              <div className="bg-[var(--paper-card)] rounded-2xl shadow-card p-6 sticky top-24">
                <h2 className="text-2xl font-bold text-[var(--ink)] mb-6">Order Summary</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-[var(--ink-70)]">
                    <span>Subtotal ({totalItems} items)</span>
                    <span className="font-semibold">₹{totalPrice.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-[var(--ink-70)]">
                    <span>Shipping</span>
                    {shipping === 0 ? (
                      <span className="font-semibold text-[var(--mint)]">FREE</span>
                    ) : (
                      <span className="font-semibold">₹{shipping}</span>
                    )}
                  </div>

                  {gstIncluded > 0 && (
                    <div className="flex justify-between text-sm text-[var(--ink-40)]">
                      <span>Includes GST</span>
                      <span className="data">{formatINR(gstIncluded)}</span>
                    </div>
                  )}

                  {discountAmt > 0 && (
                    <div className="flex justify-between text-[var(--mint)]">
                      <span className="font-medium flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        {discount?.type === "first_order" ? "First Order Discount" : discount?.name || "Discount"}
                      </span>
                      <span className="font-bold">-₹{discountAmt.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t-2 border-[var(--foil-soft)] pt-4 flex justify-between items-center">
                    <span className="text-lg font-bold text-[var(--ink)]">Total</span>
                    <div className="text-right">
                      {discountAmt > 0 && (
                        <p className="text-xs text-[var(--ink-40)] line-through">
                          ₹{(totalPrice + shipping).toLocaleString()}
                        </p>
                      )}
                      <span className="text-2xl font-bold text-[var(--ink)]">
                        ₹{finalTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Savings badge */}
                {discountAmt > 0 && (
                  <div className="bg-[var(--mint-soft)] border border-[var(--mint)] rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[var(--mint)] flex-shrink-0" />
                    <p className="text-sm font-medium text-[var(--mint)]">
                      You&apos;re saving ₹{discountAmt.toFixed(2)} on this order!
                    </p>
                  </div>
                )}

                {/* Free Shipping Banner */}
                {shipping > 0 && (
                  <div className="bg-[var(--foil-soft)] border-2 border-[var(--foil)] rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-[var(--ink)] flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-[var(--ink)] mb-1">
                          Add ₹{(500 - totalPrice).toLocaleString()} more for FREE shipping!
                        </p>
                        <p className="text-[var(--ink-70)]">Orders above ₹500 get free delivery</p>
                      </div>
                    </div>
                  </div>
                )}

                {hasRxItems && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg bg-[var(--rx-soft)] p-3">
                    <Pill className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--rx)]" aria-hidden="true" />
                    <p className="text-sm text-[var(--ink)]">
                      Some items need a prescription. You&apos;ll attach it at checkout before payment.
                    </p>
                  </div>
                )}

                <Link href="/checkout">
                  <Button className="w-full bg-[var(--mint)] hover:opacity-90 text-[var(--paper-card)] py-6 text-lg font-semibold shadow-card mb-4">
                    Proceed to Checkout
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>

                <div className="space-y-3 text-sm text-[var(--ink-70)]">
                  {[
                    "Secure checkout",
                    "Easy returns within 7 days",
                    "100% authentic products",
                  ].map((text) => (
                    <div key={text} className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-[var(--mint-soft)] rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-[var(--mint)]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </div>
  )
}
