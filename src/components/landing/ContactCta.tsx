'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { CONTACT, SOCIAL_LINKS } from '@/lib/constants';

/**
 * ContactCta — contact info + WhatsApp CTA + link to /contact.
 */
export function ContactCta() {
  const shouldReduceMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24 bg-gradient-to-br from-[var(--mint-soft)] to-[var(--paper)]">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
        viewport={{ once: true, margin: '0px 0px -100px 0px' }}
      >
        <h2 className="text-[length:var(--step-2)] font-bold text-[var(--ink)]">
          Get in touch
        </h2>
        <p className="mt-2 text-[var(--ink-70)]">
          Have questions? We're here to help
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {/* Phone */}
          <a
            href={CONTACT.phoneHref}
            className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-[var(--foil)] bg-[var(--paper-card)] p-6 hover:border-[var(--mint)] transition-colors"
          >
            <Phone className="h-6 w-6 text-[var(--mint)]" aria-hidden="true" />
            <span className="font-semibold text-[var(--ink)]">Call us</span>
            <span className="text-[0.875rem] text-[var(--ink-70)]">{CONTACT.phone}</span>
          </a>

          {/* Email */}
          <a
            href={CONTACT.emailHref}
            className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-[var(--foil)] bg-[var(--paper-card)] p-6 hover:border-[var(--mint)] transition-colors"
          >
            <Mail className="h-6 w-6 text-[var(--mint)]" aria-hidden="true" />
            <span className="font-semibold text-[var(--ink)]">Email us</span>
            <span className="text-[0.875rem] text-[var(--ink-70)] break-all">{CONTACT.email}</span>
          </a>

          {/* Address */}
          <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-[var(--foil)] bg-[var(--paper-card)] p-6">
            <MapPin className="h-6 w-6 text-[var(--mint)]" aria-hidden="true" />
            <span className="font-semibold text-[var(--ink)]">Visit us</span>
            <span className="text-[0.875rem] text-[var(--ink-70)] text-center">
              {CONTACT.address.line1}, {CONTACT.address.city}
            </span>
          </div>
        </div>

        {/* WhatsApp CTA */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row justify-center">
          <a
            href={SOCIAL_LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[#25D366] px-8 font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
            Chat on WhatsApp
          </a>
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--foil)] bg-[var(--paper-card)] px-8 font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--foil-soft)]"
          >
            Contact form
          </Link>
        </div>

        <p className="mt-6 text-[0.875rem] text-[var(--ink-70)]">
          {CONTACT.hours}
        </p>
      </motion.div>
    </section>
  );
}
