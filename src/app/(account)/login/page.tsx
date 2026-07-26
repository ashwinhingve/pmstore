"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import { AuthShell, AuthCard } from "@/components/account/AuthShell"
import { Logo } from "@/components/shared/Logo"
import { Button } from "@/components/ui/button"
import { Tabs } from "@/components/ui/tabs"
import { Mail, ArrowLeft, Phone, ShieldCheck, KeyRound, BadgeCheck } from "lucide-react"
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

  const inputClass =
    "w-full rounded-[var(--radius-sm)] border-2 border-[var(--foil-soft)] bg-[var(--paper-card)] px-4 py-3 text-base text-[var(--ink)] placeholder:text-[var(--ink-40)] focus:outline-none focus:border-[var(--ink)]"

  // ── Loading state ────────────────────────────────────────────────────────────
  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--foil-soft)] border-t-[var(--ink)]" />
          <p className="text-[var(--ink-70)]">Taking you to your account…</p>
        </div>
      </div>
    )
  }

  return (
    <AuthShell>
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-4 flex items-center justify-center text-[var(--mint)]">
          <Logo variant="mark" size={48} />
        </div>
        <h1 className="mb-2 text-[length:var(--step-2)] text-[var(--ink)]">
          Welcome to PM Store
        </h1>
        <p className="text-[var(--ink-70)]">Sign in to continue</p>
      </div>

      {/* Card */}
      <AuthCard>
        <Tabs
          tabs={[
            {
              id: "google",
              label: "Google",
              content: null, // Placeholder, will be rendered below
            },
            {
              id: "email",
              label: "Email OTP",
              content: null, // Placeholder, will be rendered below
            },
            {
              id: "mobile",
              label: "Mobile OTP",
              content: null, // Placeholder, will be rendered below
            },
          ]}
          defaultTab="google"
          onChange={(tabId) => handleTabChange(tabId as Tab)}
        />

        <div className="p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="mb-6 rounded-[var(--radius-sm)] border border-[var(--ink)] bg-[var(--paper)] px-4 py-3 text-base text-[var(--ink)]"
              role="alert"
            >
              {error}
            </motion.div>
          )}

          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* ── Google Tab ── */}
            {activeTab === "google" && (
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                variant="outline"
                className="h-14 w-full gap-3 text-lg font-semibold"
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--foil)] border-t-[var(--ink)]" />
                    Signing in…
                  </span>
                ) : (
                  <>
                    <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
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
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--ink-70)]">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendEmailOtp()}
                    placeholder="you@example.com"
                    className={inputClass}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={handleSendEmailOtp}
                  disabled={isLoading || !email}
                  className="h-14 w-full gap-3 text-lg font-semibold"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-3">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--paper-card)]/40 border-t-[var(--paper-card)]" />
                      Sending code…
                    </span>
                  ) : (
                    <><Mail className="h-5 w-5" /><span>Send OTP</span></>
                  )}
                </Button>
              </div>
            )}

            {activeTab === "email" && emailOtpStep === "otp" && (
              <div className="space-y-4">
                <div className="mb-2 text-center">
                  <p className="text-sm text-[var(--ink-70)]">
                    We sent a 6-digit code to{" "}
                    <strong className="text-[var(--ink)]">{email}</strong>
                  </p>
                </div>
                <div>
                  <label htmlFor="emailOtp" className="mb-1 block text-sm font-medium text-[var(--ink-70)]">
                    Verification code
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
                    className={`${inputClass} text-center text-2xl tracking-[0.3em]`}
                    style={{ fontFamily: "var(--font-data)" }}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleVerifyEmailOtp}
                  disabled={isLoading || emailOtp.length !== 6}
                  className="h-14 w-full text-lg font-semibold"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-3">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--paper-card)]/40 border-t-[var(--paper-card)]" />
                      Verifying…
                    </span>
                  ) : "Verify and continue"}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={() => { setEmailOtpStep("input"); setEmailOtp(""); setError("") }}
                    className="flex items-center gap-1 font-medium text-[var(--ink)] hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Change email
                  </button>
                  <button
                    onClick={() => { if (emailCooldown > 0) return; setEmailOtp(""); setError(""); handleSendEmailOtp() }}
                    disabled={emailCooldown > 0}
                    className={`font-medium ${emailCooldown > 0 ? "cursor-not-allowed text-[var(--ink-40)]" : "text-[var(--ink)] hover:underline"}`}
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
                  <label htmlFor="phone" className="mb-1 block text-sm font-medium text-[var(--ink-70)]">
                    Mobile number
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-[var(--radius-sm)] border-2 border-r-0 border-[var(--foil-soft)] bg-[var(--foil-soft)] px-3 text-sm font-medium text-[var(--ink-70)]">
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
                      className={`${inputClass} flex-1 rounded-l-none`}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSendMobileOtp}
                  disabled={isLoading || phone.length !== 10}
                  className="h-14 w-full gap-3 text-lg font-semibold"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-3">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--paper-card)]/40 border-t-[var(--paper-card)]" />
                      Sending code…
                    </span>
                  ) : (
                    <><Phone className="h-5 w-5" /><span>Send OTP</span></>
                  )}
                </Button>
              </div>
            )}

            {activeTab === "mobile" && mobileOtpStep === "otp" && (
              <div className="space-y-4">
                <div className="mb-2 text-center">
                  <p className="text-sm text-[var(--ink-70)]">
                    We sent a 6-digit code to{" "}
                    <strong className="text-[var(--ink)]">+91 {phone}</strong>
                  </p>
                </div>
                <div>
                  <label htmlFor="mobileOtp" className="mb-1 block text-sm font-medium text-[var(--ink-70)]">
                    Verification code
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
                    className={`${inputClass} text-center text-2xl tracking-[0.3em]`}
                    style={{ fontFamily: "var(--font-data)" }}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <Button
                  onClick={handleVerifyMobileOtp}
                  disabled={isLoading || mobileOtp.length !== 6}
                  className="h-14 w-full text-lg font-semibold"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-3">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--paper-card)]/40 border-t-[var(--paper-card)]" />
                      Verifying…
                    </span>
                  ) : "Verify and continue"}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={() => { setMobileOtpStep("input"); setMobileOtp(""); setError("") }}
                    className="flex items-center gap-1 font-medium text-[var(--ink)] hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Change number
                  </button>
                  <button
                    onClick={() => { if (mobileCooldown > 0) return; setMobileOtp(""); setError(""); handleSendMobileOtp() }}
                    disabled={mobileCooldown > 0}
                    className={`font-medium ${mobileCooldown > 0 ? "cursor-not-allowed text-[var(--ink-40)]" : "text-[var(--ink)] hover:underline"}`}
                  >
                    {mobileCooldown > 0 ? `Resend in ${mobileCooldown}s` : "Resend OTP"}
                  </button>
                </div>
              </div>
            )}

            {/* Info Section */}
            <div className="mt-8 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--mint-soft)] p-4">
              <p className="text-center text-sm text-[var(--ink-70)]">
                By signing in, you agree to our{" "}
                <a href="/terms-and-conditions" className="font-medium text-[var(--ink)] hover:underline">Terms of Service</a>{" "}
                and{" "}
                <a href="/privacy-policy" className="font-medium text-[var(--ink)] hover:underline">Privacy Policy</a>.
              </p>
            </div>
          </motion.div>
        </div>
      </AuthCard>

      {/* Trust row */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          { icon: ShieldCheck, label: "Encrypted sign-in" },
          { icon: KeyRound, label: "No password to remember" },
          { icon: BadgeCheck, label: "Licensed pharmacy" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 text-center"
          >
            <Icon className="h-5 w-5 text-[var(--mint)]" aria-hidden="true" />
            <span className="text-xs text-[var(--ink-70)]">{label}</span>
          </div>
        ))}
      </div>
    </AuthShell>
  )
}
