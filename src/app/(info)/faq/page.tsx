import type { Metadata } from 'next';
import { faqSchema, safeJsonLd } from '@/lib/seo/structured-data';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions — Pratigya Medical Store',
  description:
    'Answers about prescriptions, delivery, generic alternatives, refunds and refill reminders at Pratigya Medical Store.',
};

/**
 * FAQ page. Renders the questions AND emits FAQPage JSON-LD (via faqSchema) so
 * the answers are eligible for Google's rich-result treatment. One source of
 * truth — FAQS — drives both the visible list and the structured data.
 */
const FAQS = [
  {
    question: 'Do I need a prescription to order medicines?',
    answer:
      'Over-the-counter medicines can be ordered directly. Prescription medicines (Schedule H, H1 and X) require you to upload a valid prescription, which our registered pharmacist verifies before dispatch.',
  },
  {
    question: 'How do you compare medicine prices?',
    answer:
      'We show the price per tablet, per ml or per unit — not just the pack price — so you can compare brands fairly. A cheaper-looking pack is not always cheaper per tablet, and we make the real per-unit cost clear.',
  },
  {
    question: 'Are generic alternatives safe?',
    answer:
      'Yes. A generic medicine has the same active salt, strength and dosage form as the branded one and is regulated to the same standard. On each product page we show equivalent alternatives so you can choose a cheaper option with the same composition.',
  },
  {
    question: 'Which areas do you deliver to?',
    answer:
      'We deliver across India through our logistics partner, subject to PIN-code serviceability, which you can check at checkout. We do not ship internationally.',
  },
  {
    question: 'What are refill reminders?',
    answer:
      'For medicines you take regularly, we can email you shortly before your supply is likely to run out, based on your last order, so you can reorder in time. You can turn reminders off any time in your account settings.',
  },
  {
    question: 'Can I reorder a previous order in one tap?',
    answer:
      'Yes. From your order history you can reorder a past order; we add the still-available items to your cart and tell you if anything is out of stock, discontinued, or now needs a prescription.',
  },
];

export default function FaqPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema(FAQS)) }}
      />

      <h1 className="mb-8 text-[length:var(--step-3)] font-extrabold text-[var(--ink)]">
        Frequently asked questions
      </h1>

      <dl className="space-y-6">
        {FAQS.map((faq) => (
          <div
            key={faq.question}
            className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6"
          >
            <dt className="mb-2 font-bold text-[var(--ink)]">{faq.question}</dt>
            <dd className="text-[length:var(--step--1)] leading-relaxed text-[var(--ink)]">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
