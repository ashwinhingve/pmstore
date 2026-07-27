import type { Metadata } from 'next';
import { faqSchema, safeJsonLd } from '@/lib/seo/structured-data';
import { FAQAccordion, type FAQItem } from '@/components/shared/FAQAccordion';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions — Pratigya Medical Store',
  description:
    'Answers about prescriptions, delivery, generic alternatives, refunds and refill reminders at Pratigya Medical Store.',
};

/**
 * FAQ page. Renders questions grouped by topic using the FAQAccordion component
 * and emits FAQPage JSON-LD so answers are eligible for Google's rich-result treatment.
 */
const FAQ_SECTIONS = [
  {
    title: 'Medicines & prescriptions',
    description: 'How medicines are classified and prescribed.',
    items: [
      {
        question: 'Do I need a prescription to order medicines?',
        answer:
          'Over-the-counter medicines can be ordered directly. Prescription medicines (Schedule H, H1 and X) require you to upload a valid prescription, which our registered pharmacist verifies before dispatch.',
      },
      {
        question: 'Are generic alternatives safe?',
        answer:
          'Yes. A generic medicine has the same active salt, strength and dosage form as the branded one and is regulated to the same standard. On each product page we show equivalent alternatives so you can choose a cheaper option with the same composition.',
      },
    ],
  },
  {
    title: 'Pricing & comparison',
    description: 'Understanding medicine prices and finding the best option.',
    items: [
      {
        question: 'How do you compare medicine prices?',
        answer:
          'We show the price per tablet, per ml or per unit — not just the pack price — so you can compare brands fairly. A cheaper-looking pack is not always cheaper per tablet, and we make the real per-unit cost clear.',
      },
    ],
  },
  {
    title: 'Ordering & delivery',
    description: 'Delivery areas and reordering.',
    items: [
      {
        question: 'Which areas do you deliver to?',
        answer:
          'We deliver across India through our logistics partner, subject to PIN-code serviceability, which you can check at checkout. We do not ship internationally.',
      },
      {
        question: 'Can I reorder a previous order in one tap?',
        answer:
          'Yes. From your order history you can reorder a past order; we add the still-available items to your cart and tell you if anything is out of stock, discontinued, or now needs a prescription.',
      },
    ],
  },
  {
    title: 'Refill reminders',
    description: 'Setting up and managing automatic reminders.',
    items: [
      {
        question: 'What are refill reminders?',
        answer:
          'For medicines you take regularly, we can email you shortly before your supply is likely to run out, based on your last order, so you can reorder in time. You can turn reminders off any time in your account settings.',
      },
    ],
  },
];

// Flatten sections into a single FAQS array for JSON-LD
const FAQS = FAQ_SECTIONS.flatMap((section) => section.items);

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema(FAQS)) }}
      />

      <h1 className="mb-3 text-[length:var(--step-3)] text-[var(--ink)]">
        Frequently asked questions
      </h1>
      <p className="mb-8 text-[var(--ink-70)]">
        Answers to common questions about medicines, prescriptions, pricing and delivery.
      </p>

      <div className="space-y-8">
        {FAQ_SECTIONS.map((section) => (
          <section key={section.title}>
            <div className="mb-4">
              <h2 className="text-[length:var(--step-1)] font-semibold text-[var(--ink)]">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--ink-70)]">{section.description}</p>
            </div>
            <Card variant="surface" padding="none" className="overflow-hidden">
              <FAQAccordion items={section.items} />
            </Card>
          </section>
        ))}
      </div>

      <p className="mt-10 text-center text-[var(--ink-70)]">
        Can&apos;t find your answer?{' '}
        <a href="/contact" className="font-medium text-[var(--brand)] underline underline-offset-2">
          Contact us
        </a>
      </p>
    </div>
  );
}
