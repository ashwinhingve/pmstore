"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { Button } from "@/components/ui/button"
import { LogIn, Mail, ArrowLeft, Phone } from "lucide-react"
import { motion } from "framer-motion"

type Tab = "google" | "email" | "mobile"
type OtpStep = "input" | "otp"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const [activeTab, setActiveTab] = useState<Tab>("google")

  // Email OTP state
  const [emailOtpStep, setEmailOtpStep] = useState<OtpStep>("input")
  const [email, setEmail] = useState("")
  const [emailOtp, setEmailOtp] = useState("")
  const [emailCooldown, setEmailCooldown] = useState(0)

  // Mobile OTP state
  const [mobileOtpStep, setMobileOtpStep] = useState<OtpStep>("input")
  const [phone, setPhone] = useState("")
  const [mobileOtp, setMobileOtp] = useState("")
  const [mobileCooldown, setMobileCooldown] = useState(0)

  // Handle redirection when user is already logged in or just logged in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const redirect = searchParams.get("redirect")
      if (redirect && redirect !== '/login') {
        router.push(redirect)
      } else {
        if (session.user.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/orders')
        }
      }
    }
  }, [status, session, router, searchParams])

  // Cooldown timers
  useEffect(() => {
    if (emailCooldown <= 0) return
    const t = setTimeout(() => setEmailCooldown(emailCooldown - 1), 1000)
    return () => clearTimeout(t)
  }, [emailCooldown])

  useEffect(() => {
    if (mobileCooldown <= 0) return
    const t = setTimeout(() => setMobileCooldown(mobileCooldown - 1), 1000)
    return () => clearTimeout(t)
  }, [mobileCooldown])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setError("")
  }

  // ── Google ──────────────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError("")
    try {
      const result = await signIn("google", { redirect: false })
      if (result?.error) {
        setError("Failed to sign in with Google. Please try again.")
        setIsLoading(false)
      }
    } catch {
      setError("An error occurred during sign in. Please try again.")
      setIsLoading(false)
    }
  }

  // ── Email OTP ────────────────────────────────────────────────────────────────
  const handleSendEmailOtp = async () => {
    if (!email) { setError("Please enter your email address."); return }
    setIsLoading(true); setError("")
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok && res.status === 400) {
        const data = await res.json()
        setError(data.message || "Invalid email address.")
        setIsLoading(false)
        return
      }
      setEmailOtpStep("otp")
      setEmailCooldown(60)
    } catch {
      setError("Failed to send OTP. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length !== 6) { setError("Please enter the 6-digit code."); return }
    setIsLoading(true); setError("")
    try {
      const result = await signIn("email-otp", { redirect: false, email, otp: emailOtp })
      if (result?.error) { setError(result.error); setIsLoading(false) }
    } catch {
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  // ── Mobile OTP ───────────────────────────────────────────────────────────────
  const handleSendMobileOtp = async () => {
    if (!phone) { setError("Please enter your mobile number."); return }
    setIsLoading(true); setError("")
    try {
      const res = await fetch("/api/auth/send-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || "Failed to send OTP.")
        setIsLoading(false)
        return
      }
      setMobileOtpStep("otp")
      setMobileCooldown(60)
    } catch {
      setError("Failed to send OTP. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp || mobileOtp.length !== 6) { setError("Please enter the 6-digit code."); return }
    setIsLoading(true); setError("")
    try {
      const result = await signIn("mobile-otp", { redirect: false, phone, otp: mobileOtp })
      if (result?.error) { setError(result.error); setIsLoading(false) }
    } catch {
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50 py-12 md:py-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50 py-12 md:py-20">
      <div className="container mx-auto px-4">
        <AnimatedSection direction="up" className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <LogIn className="w-12 h-12 text-amber-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              <span className="bg-gradient-to-r from-amber-600 to-red-700 bg-clip-text text-transparent">
                Welcome to PMStore
              </span>
            </h1>
            <p className="text-gray-600 text-lg">Sign in to continue</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {(["google", "email", "mobile"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? "text-amber-600 border-b-2 border-amber-600 bg-amber-50/50"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "google" ? "Google" : tab === "email" ? "Email OTP" : "Mobile OTP"}
                </button>
              ))}
            </div>

            <div className="p-10">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg text-base"
                >
                  {error}
                </motion.div>
              )}

              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* ── Google Tab ── */}
                {activeTab === "google" && (
                  <Button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 hover:border-gray-400 py-6 text-lg font-semibold shadow-lg transition-all duration-300 flex items-center justify-center gap-3"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 border-3 border-gray-300 border-t-amber-600 rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </Button>
                )}

                {/* ── Email OTP Tab ── */}
                {activeTab === "email" && emailOtpStep === "input" && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendEmailOtp()}
                        placeholder="you@example.com"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:ring-amber-500 focus:outline-none text-gray-900 text-base"
                        disabled={isLoading}
                      />
                    </div>
                    <Button
                      onClick={handleSendEmailOtp}
                      disabled={isLoading || !email}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-6 text-lg font-semibold shadow-lg transition-all duration-300 flex items-center justify-center gap-3"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 border-3 border-amber-300 border-t-white rounded-full animate-spin"></div>
                          <span>Sending OTP...</span>
                        </div>
                      ) : (
                        <><Mail className="w-5 h-5" /><span>Send OTP</span></>
                      )}
                    </Button>
                  </div>
                )}

                {activeTab === "email" && emailOtpStep === "otp" && (
                  <div className="space-y-4">
                    <div className="text-center mb-2">
                      <p className="text-sm text-gray-600">
                        We sent a 6-digit code to <strong>{email}</strong>
                      </p>
                    </div>
                    <div>
                      <label htmlFor="emailOtp" className="block text-sm font-medium text-gray-700 mb-1">
                        Verification Code
                      </label>
                      <input
                        id="emailOtp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && handleVerifyEmailOtp()}
                        placeholder="000000"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:ring-amber-500 focus:outline-none text-gray-900 text-center text-2xl tracking-[0.3em] font-mono"
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>
                    <Button
                      onClick={handleVerifyEmailOtp}
                      disabled={isLoading || emailOtp.length !== 6}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-6 text-lg font-semibold shadow-lg transition-all duration-300"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 border-3 border-amber-300 border-t-white rounded-full animate-spin"></div>
                          <span>Verifying...</span>
                        </div>
                      ) : "Verify & Login"}
                    </Button>
                    <div className="flex items-center justify-between text-sm">
                      <button
                        onClick={() => { setEmailOtpStep("input"); setEmailOtp(""); setError("") }}
                        className="text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Change email
                      </button>
                      <button
                        onClick={() => { if (emailCooldown > 0) return; setEmailOtp(""); setError(""); handleSendEmailOtp() }}
                        disabled={emailCooldown > 0}
                        className={`font-medium ${emailCooldown > 0 ? "text-gray-400 cursor-not-allowed" : "text-amber-600 hover:text-amber-700"}`}
                      >
                        {emailCooldown > 0 ? `Resend in ${emailCooldown}s` : "Resend OTP"}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Mobile OTP Tab ── */}
                {activeTab === "mobile" && mobileOtpStep === "input" && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile Number
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 border-2 border-r-0 border-gray-300 rounded-l-lg bg-gray-50 text-gray-600 text-sm font-medium">
                          +91
                        </span>
                        <input
                          id="phone"
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={(e) => e.key === "Enter" && handleSendMobileOtp()}
                          placeholder="98765 43210"
                          className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-r-lg focus:border-amber-500 focus:ring-amber-500 focus:outline-none text-gray-900 text-base"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleSendMobileOtp}
                      disabled={isLoading || phone.length !== 10}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-6 text-lg font-semibold shadow-lg transition-all duration-300 flex items-center justify-center gap-3"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 border-3 border-amber-300 border-t-white rounded-full animate-spin"></div>
                          <span>Sending OTP...</span>
                        </div>
                      ) : (
                        <><Phone className="w-5 h-5" /><span>Send OTP</span></>
                      )}
                    </Button>
                  </div>
                )}

                {activeTab === "mobile" && mobileOtpStep === "otp" && (
                  <div className="space-y-4">
                    <div className="text-center mb-2">
                      <p className="text-sm text-gray-600">
                        We sent a 6-digit code to <strong>+91 {phone}</strong>
                      </p>
                    </div>
                    <div>
                      <label htmlFor="mobileOtp" className="block text-sm font-medium text-gray-700 mb-1">
                        Verification Code
                      </label>
                      <input
                        id="mobileOtp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={mobileOtp}
                        onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && handleVerifyMobileOtp()}
                        placeholder="000000"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-amber-500 focus:ring-amber-500 focus:outline-none text-gray-900 text-center text-2xl tracking-[0.3em] font-mono"
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>
                    <Button
                      onClick={handleVerifyMobileOtp}
                      disabled={isLoading || mobileOtp.length !== 6}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-6 text-lg font-semibold shadow-lg transition-all duration-300"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 border-3 border-amber-300 border-t-white rounded-full animate-spin"></div>
                          <span>Verifying...</span>
                        </div>
                      ) : "Verify & Login"}
                    </Button>
                    <div className="flex items-center justify-between text-sm">
                      <button
                        onClick={() => { setMobileOtpStep("input"); setMobileOtp(""); setError("") }}
                        className="text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Change number
                      </button>
                      <button
                        onClick={() => { if (mobileCooldown > 0) return; setMobileOtp(""); setError(""); handleSendMobileOtp() }}
                        disabled={mobileCooldown > 0}
                        className={`font-medium ${mobileCooldown > 0 ? "text-gray-400 cursor-not-allowed" : "text-amber-600 hover:text-amber-700"}`}
                      >
                        {mobileCooldown > 0 ? `Resend in ${mobileCooldown}s` : "Resend OTP"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Info Section */}
                <div className="mt-8 p-4 bg-gradient-to-r from-amber-50 to-red-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-center text-gray-700">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="text-center p-4 bg-white rounded-lg shadow-md">
              <div className="text-2xl mb-2">🔒</div>
              <h3 className="font-semibold text-gray-800 mb-1">Secure</h3>
              <p className="text-sm text-gray-600">Your data is safe with us</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-md">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-semibold text-gray-800 mb-1">Fast</h3>
              <p className="text-sm text-gray-600">Quick and easy sign in</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg shadow-md">
              <div className="text-2xl mb-2">✨</div>
              <h3 className="font-semibold text-gray-800 mb-1">Simple</h3>
              <p className="text-sm text-gray-600">No passwords to remember</p>
            </div>
          </motion.div>
        </AnimatedSection>
      </div>
    </div>
  )
}
