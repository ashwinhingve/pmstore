'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { CONTACT, SOCIAL_LINKS } from '@/lib/constants';

/**
 * ContactCta — closing brand-orange band: contact info, WhatsApp CTA and a link
 * to /contact. The WhatsApp button stays green — that is WhatsApp's own colour,
 * not a theme accent.
 */
export function ContactCta() {
  const reduceMotion = useReducedMotion();

  const cardClass =
    'flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-[var(--paper)]/15 bg-[var(--paper)]/5 p-6 transition-colors duration-[var(--dur-fast)]';

  return (
    <section className="bg-[image:var(--surface-brand)]">
      <Container className="py-14 sm:py-20">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.5 }}
          viewport={{ once: true, margin: '0px 0px -100px 0px' }}
        >
          <SectionHeading
            align="center"
            onDark
            eyebrow="Contact"
            title="Get in touch"
            description="Have questions? We're here to help"
            className="mb-12"
          />

          <div className="grid gap-5 sm:grid-cols-3">
            <a href={CONTACT.phoneHref} className={`${cardClass} hover:border-[var(--brand-ink)]`}>
              <Phone className="h-6 w-6 text-[var(--brand-ink)]" aria-hidden="true" />
              <span className="font-semibold text-[var(--paper)]">Call us</span>
              <span className="data text-sm text-[var(--brand-ink)]/85">{CONTACT.phone}</span>
            </a>

            <a href={CONTACT.emailHref} className={`${cardClass} hover:border-[var(--brand-ink)]`}>
              <Mail className="h-6 w-6 text-[var(--brand-ink)]" aria-hidden="true" />
              <span className="font-semibold text-[var(--paper)]">Email us</span>
              <span className="break-all text-sm text-[var(--brand-ink)]/85">{CONTACT.email}</span>
            </a>

            <div className={cardClass}>
              <MapPin className="h-6 w-6 text-[var(--brand-ink)]" aria-hidden="true" />
              <span className="font-semibold text-[var(--paper)]">Visit us</span>
              <span className="text-center text-sm text-[var(--brand-ink)]/85">
                {CONTACT.address.line1}, {CONTACT.address.city}
              </span>
            </div>
          </div>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--mint)] px-8 font-semibold text-[var(--paper-card)] shadow-[var(--shadow-sm)] transition-[background-color,box-shadow] duration-[var(--dur-fast)] hover:bg-[var(--mint-deep)] hover:shadow-[var(--shadow-md)]"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Chat on WhatsApp
            </a>
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] border border-[var(--paper)]/30 px-8 font-semibold text-[var(--paper)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--paper)]/60 hover:bg-[var(--paper)]/10"
            >
              Contact form
            </Link>
          </div>

          <p className="mt-6 text-sm text-[var(--brand-ink)]/85">{CONTACT.hours}</p>
        </motion.div>
      </Container>
    </section>
  );
}
