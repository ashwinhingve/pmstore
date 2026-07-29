"use client"

import React from "react"
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/shared/AnimatedSection"
import { CountUpStat } from "@/components/shared/CountUpStat"
import { CertificationBadge } from "@/components/shared/CertificationBadge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { SITE_NAME, SITE_SHORT_NAME, SITE_SLOGAN, VALUE_PROPS } from "@/lib/constants"
import {
  Heart,
  Leaf,
  Shield,
  Users,
  TrendingUp,
  Award,
  Target,
  Lightbulb,
  CheckCircle,
  Package,
  Globe,
} from "lucide-react"

export default function AboutPage() {
  return (
    <main>
      {/* Hero Section — navy prescription-counter band */}
      <section className="relative overflow-hidden bg-[image:var(--surface-hero)] py-20 text-[var(--paper)] md:py-28">
        <div className="mx-auto w-full max-w-[1600px] xl:w-4/5 px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-soft)]">
              About {SITE_SHORT_NAME}
            </p>
            <h1 className="mb-5 font-[family-name:var(--font-display)] text-[length:var(--step-3)] font-extrabold tracking-tight text-[var(--paper)]">
              {SITE_SLOGAN}
            </h1>
            <p className="text-lg leading-relaxed text-[var(--ink-10)] md:text-xl">
              {SITE_SHORT_NAME} — Pratigya Medical Store — has served Bhopal for over 20 years,
              dispensing genuine medicines at generic prices. Our aim is simple: help every family
              save 60–70% with government-approved generic brands, trained pharmacists, and free
              home delivery.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 md:py-24 bg-[var(--paper-card)]">
        <div className="mx-auto w-full max-w-[1600px] xl:w-4/5 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            <AnimatedSection direction="left">
              <div className="bg-[var(--paper-card)] rounded-[var(--radius-md)] p-10 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)] h-full group border border-[var(--foil-soft)]">
                <div className="w-20 h-20 bg-[var(--brand)] rounded-full flex items-center justify-center mb-6">
                  <Target className="w-10 h-10 text-[var(--brand-ink)]" />
                </div>
                <h2 className="text-3xl font-bold font-display text-[var(--ink)] mb-4">Our mission</h2>
                <p className="text-lg text-[var(--ink-70)] leading-relaxed">
                  Make genuine prescription and OTC medicines accessible at affordable prices. We partner with trusted suppliers to dispense government-approved generic brands at 60–70% savings, backed by trained pharmacists and free home delivery.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection direction="right">
              <div className="bg-[var(--paper-card)] rounded-[var(--radius-md)] p-10 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)] h-full group border border-[var(--foil-soft)]">
                <div className="w-20 h-20 bg-[var(--brand)] rounded-full flex items-center justify-center mb-6">
                  <Lightbulb className="w-10 h-10 text-[var(--brand-ink)]" />
                </div>
                <h2 className="text-3xl font-bold font-display text-[var(--ink)] mb-4">Our vision</h2>
                <p className="text-lg text-[var(--ink-70)] leading-relaxed">
                  Bridge every doctor and patient with trust. Expand from Bhopal to serve all of India, making affordable genuine medicines a reality and establishing healthcare affordability as a standard, not a luxury.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-24 bg-[var(--paper)]">
        <div className="mx-auto w-full max-w-[1600px] xl:w-4/5 px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-[length:var(--step-2)] mb-2 text-[var(--ink)]">
              Our impact
            </h2>
            <div className="w-24 h-1 bg-[var(--brand)] mx-auto mt-4"></div>
          </AnimatedSection>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <CountUpStat
              end={20}
              suffix="+"
              label="Years serving Bhopal"
              icon={<Award className="w-12 h-12 text-[var(--ink)]" />}
            />
            <CountUpStat
              end={10000}
              suffix="+"
              label="Satisfied customers"
              icon={<Users className="w-12 h-12 text-[var(--ink)]" />}
            />
            <CountUpStat
              end={5000}
              suffix="+"
              label="Genuine medicines"
              icon={<Package className="w-12 h-12 text-[var(--ink)]" />}
            />
            <CountUpStat
              end={60}
              suffix="%"
              label="Average savings"
              icon={<TrendingUp className="w-12 h-12 text-[var(--ink)]" />}
            />
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-24 bg-[var(--paper-card)]">
        <div className="mx-auto w-full max-w-[1600px] xl:w-4/5 px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-[length:var(--step-2)] mb-2 text-[var(--ink)]">
              Why choose us
            </h2>
            <div className="w-24 h-1 bg-[var(--brand)] mx-auto mt-4"></div>
            <p className="text-[var(--ink-70)] mt-6 max-w-2xl mx-auto">
              We bring affordable, genuine medicines to every household
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUE_PROPS.map((prop, idx) => (
              <AnimatedSection key={idx} direction="up" delay={idx * 0.05}>
                <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-6 border border-[var(--foil-soft)] h-full">
                  <p className="text-[var(--ink)] font-semibold leading-relaxed">{prop}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 md:py-24 bg-[var(--paper)]">
        <div className="mx-auto w-full max-w-[1600px] xl:w-4/5 px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-[length:var(--step-2)] mb-2 text-[var(--ink)]">
              Our values
            </h2>
            <div className="w-24 h-1 bg-[var(--brand)] mx-auto mt-4"></div>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <StaggerItem>
              <div className="bg-[var(--paper-card)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)] group text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--brand)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-[var(--brand-ink)]" />
                </div>
                <h3 className="text-xl font-bold font-display text-[var(--ink)] mb-3">Patient first</h3>
                <p className="text-[var(--ink-70)]">
                  Your health and medication access guide every decision we make.
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper-card)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)] group text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--brand)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-[var(--brand-ink)]" />
                </div>
                <h3 className="text-xl font-bold font-display text-[var(--ink)] mb-3">Genuine medicines</h3>
                <p className="text-[var(--ink-70)]">
                  We dispense only government-approved medicines from trusted suppliers.
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper-card)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)] group text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--brand)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-8 h-8 text-[var(--brand-ink)]" />
                </div>
                <h3 className="text-xl font-bold font-display text-[var(--ink)] mb-3">Affordability</h3>
                <p className="text-[var(--ink-70)]">
                  Generic brands deliver the same active salts at 60–70% lower prices.
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper-card)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)] group text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--brand)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-[var(--brand-ink)]" />
                </div>
                <h3 className="text-xl font-bold font-display text-[var(--ink)] mb-3">Expertise</h3>
                <p className="text-[var(--ink-70)]">
                  Our trained pharmacists verify prescriptions and answer your questions.
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper-card)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)] group text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--brand)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-[var(--brand-ink)]" />
                </div>
                <h3 className="text-xl font-bold font-display text-[var(--ink)] mb-3">Convenience</h3>
                <p className="text-[var(--ink-70)]">
                  Free home delivery and order by WhatsApp for busy lives.
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper-card)] rounded-[var(--radius-md)] p-8 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow duration-[var(--dur-fast)] group text-center h-full border border-[var(--foil-soft)]">
                <div className="w-16 h-16 bg-[var(--brand)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[var(--brand-ink)]" />
                </div>
                <h3 className="text-xl font-bold font-display text-[var(--ink)] mb-3">Trust</h3>
                <p className="text-[var(--ink-70)]">
                  Transparent pricing and verified medicines build lasting patient relationships.
                </p>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>


      {/* Compliance & License */}
      <section className="py-16 md:py-24 bg-[var(--paper-card)]">
        <div className="mx-auto w-full max-w-[1600px] xl:w-4/5 px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-[length:var(--step-2)] mb-2 text-[var(--ink)]">
              Government approved
            </h2>
            <div className="w-24 h-1 bg-[var(--brand)] mx-auto mt-4"></div>
            <p className="text-[var(--ink-70)] mt-6 max-w-2xl mx-auto">
              Licensed pharmacy under the Drugs & Cosmetics Act, 1940
            </p>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <StaggerItem>
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 border border-[var(--foil-soft)] text-center h-full">
                <div className="w-16 h-16 bg-[var(--mint-soft)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-[var(--mint)]" />
                </div>
                <h3 className="text-lg font-bold font-display text-[var(--ink)] mb-2">Registered pharmacy</h3>
                <p className="text-[var(--ink-70)] text-sm">
                  Licensed under Food & Drug Administration, Madhya Pradesh
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 border border-[var(--foil-soft)] text-center h-full">
                <div className="w-16 h-16 bg-[var(--mint-soft)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-[var(--mint)]" />
                </div>
                <h3 className="text-lg font-bold font-display text-[var(--ink)] mb-2">Verified medicines</h3>
                <p className="text-[var(--ink-70)] text-sm">
                  All products sourced from licensed distributors
                </p>
              </div>
            </StaggerItem>

            <StaggerItem>
              <div className="bg-[var(--paper)] rounded-[var(--radius-md)] p-8 border border-[var(--foil-soft)] text-center h-full">
                <div className="w-16 h-16 bg-[var(--mint-soft)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-[var(--mint)]" />
                </div>
                <h3 className="text-lg font-bold font-display text-[var(--ink)] mb-2">20+ years of trust</h3>
                <p className="text-[var(--ink-70)] text-sm">
                  Serving Bhopal with pharmacy care and affordability
                </p>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-[var(--paper)]">
        <div className="mx-auto w-full max-w-[1600px] xl:w-4/5 px-4 sm:px-6 lg:px-8">
          <AnimatedSection direction="up" className="text-center max-w-4xl mx-auto">
            <h2 className="text-[length:var(--step-2)] mb-6 text-[var(--ink)]">
              Start saving on medicines today
            </h2>
            <p className="text-xl text-[var(--ink-70)] mb-8">
              Order genuine medicines at 60–70% savings, with free home delivery and pharmacist verification.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products">
                <Button size="lg" className="bg-[var(--ink)] hover:bg-[var(--ink-deep)] text-[var(--paper-card)] px-10 py-6 text-lg shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]">
                  Browse medicines
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline" className="border-2 border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper-card)] px-10 py-6 text-lg">
                  Contact us
                </Button>
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  )
}
