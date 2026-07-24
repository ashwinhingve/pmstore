'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Accordion } from '@/components/ui/Accordion';
import { HelpCircle } from 'lucide-react';

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
  const shouldReduceMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
        viewport={{ once: true, margin: '0px 0px -100px 0px' }}
      >
        <div className="text-center mb-12">
          <h2 className="text-[length:var(--step-2)] font-bold text-[var(--ink)]">
            Frequently asked questions
          </h2>
          <p className="mt-2 text-[var(--ink-70)]">
            Quick answers to common questions
          </p>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-card)]">
          {SAMPLE_FAQS.map((faq, i) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.4,
                delay: shouldReduceMotion ? 0 : i * 0.1,
              }}
              viewport={{ once: true }}
            >
              <Accordion
                title={faq.question}
                defaultOpen={i === 0}
              >
                <p>{faq.answer}</p>
              </Accordion>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 text-[var(--mint)] font-semibold hover:opacity-80 transition-opacity"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
            View all FAQs
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
