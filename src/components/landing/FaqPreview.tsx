'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { FAQAccordion } from '@/components/shared/FAQAccordion';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';

/**
 * FaqPreview — 3-4 sample Q&As using Accordion, with a link to /faq for full list.
 */
const SAMPLE_FAQS = [
  {
    question: 'Are the medicines genuine?',
    answer:
      'Yes, all medicines are 100% genuine and sourced directly from authorized distributors. We are a licensed pharmacy with all regulatory approvals.',
  },
  {
    question: 'Do you deliver outside Bhopal?',
    answer:
      'Currently, we deliver across Bhopal. We are expanding to nearby areas. Check your pincode during checkout to see if we deliver to your location.',
  },
  {
    question: 'How do I upload a prescription?',
    answer:
      'Visit the "Upload prescription" section, take a clear photo of your prescription, and upload it. Our pharmacists will verify and prepare your order within 24 hours.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept credit/debit cards, UPI, net banking, and cash on delivery for all orders above ₹250.',
  },
];

export function FaqPreview() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-[var(--paper-tint)]">
      <Container className="py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.5 }}
          viewport={{ once: true, margin: '0px 0px -100px 0px' }}
          className="mx-auto max-w-3xl"
        >
          <SectionHeading
            align="center"
            eyebrow="Help"
            title="Frequently asked questions"
            description="Quick answers to common questions"
            className="mb-10"
          />

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-sm)]">
            <FAQAccordion items={SAMPLE_FAQS} />
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand-deep)] transition-opacity duration-[var(--dur-fast)] hover:opacity-80"
            >
              View all FAQs
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
