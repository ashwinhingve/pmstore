import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Search,
  Scale,
  FileUp,
  PackageSearch,
  Truck,
  RefreshCw,
  ArrowRight,
  Upload,
} from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'How it works — order medicines online',
  description:
    'How PM Store works: search or browse by category, compare brands by price per tablet, order or upload a prescription, request anything you can’t find, and get free home delivery in Bhopal.',
  alternates: { canonical: '/how-it-works' },
  openGraph: {
    title: 'How PM Store works',
    description:
      'Search, compare by price per tablet, order or upload a prescription, and get free home delivery in Bhopal.',
    url: '/how-it-works',
    type: 'website',
  },
};

const STEPS = [
  {
    icon: Search,
    title: 'Search or browse',
    body: 'Find your medicine by brand or salt name — search is typo-tolerant — or browse by category from the homepage.',
  },
  {
    icon: Scale,
    title: 'Compare by price per tablet',
    body: 'Every brand of the same composition sits side by side, cheapest per tablet first, with pack size next to it — so you can switch to an equivalent brand and save.',
  },
  {
    icon: FileUp,
    title: 'Add to cart or upload a prescription',
    body: 'Order over-the-counter medicines straight away. For prescription medicines, upload your prescription and a pharmacist verifies it before delivery.',
  },
  {
    icon: PackageSearch,
    title: 'Can’t find it? Request it',
    body: 'Tell us the medicine — even a photo of the pack or your doctor’s list. We source it through licensed suppliers and call you back, usually within a working day.',
  },
  {
    icon: Truck,
    title: 'Free home delivery',
    body: 'Free delivery across Bhopal with no minimum order. We deliver locally ourselves in and around 462041, and by courier further out.',
  },
  {
    icon: RefreshCw,
    title: 'Reorder and set reminders',
    body: 'Your regular medicines are saved for next time. Reorder in one tap and get a reminder before you run out.',
  },
];

/**
 * How it works — a plain-language onboarding page that maps the whole journey
 * from finding a medicine to getting it delivered, with clear next-step CTAs.
 * Reachable from the footer and mobile menu ("How it works").
 */
export default function HowItWorksPage() {
  return (
    <div className="bg-[var(--paper)]">
      {/* Hero */}
      <section className="border-b border-[var(--foil-soft)] bg-[var(--paper-tint)]">
        <Container className="py-16 md:py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand)]">
            Get started
          </p>
          <h1 className="max-w-3xl text-[length:var(--step-3)] text-[var(--ink)]">
            How PM Store works
          </h1>
          <p className="mt-4 max-w-2xl text-[length:var(--step-1)] text-[var(--ink-70)]">
            From finding the right brand at the best price per tablet to getting it delivered to your
            door — here&rsquo;s the whole journey, step by step.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-[var(--brand)] text-[var(--brand-ink)] hover:bg-[var(--brand-deep)]">
              <Link href="/products">
                Start shopping <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/custom-order">Request a medicine</Link>
            </Button>
          </div>
        </Container>
      </section>

      {/* Steps */}
      <section>
        <Container className="py-16 sm:py-20">
          <SectionHeading
            eyebrow="Step by step"
            title="Five minutes from search to checkout"
            description="No account needed to browse and compare — you only sign in when you place an order."
            className="mb-10"
          />
          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.title}
                  className="relative rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-soft)] text-[var(--brand)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span
                      className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-40)]"
                      style={{ fontFamily: 'var(--font-data)' }}
                    >
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mb-1.5 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--ink-70)]">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </Container>
      </section>

      {/* Closing CTA */}
      <section className="bg-[var(--paper-tint)]">
        <Container className="py-16 sm:py-20">
          <div className="relative isolate overflow-hidden rounded-[var(--radius-lg)] bg-[image:var(--surface-hero)] px-6 py-12 text-center shadow-[var(--shadow-feature)] sm:px-10 sm:py-16">
            <h2 className="mx-auto max-w-2xl font-[family-name:var(--font-display)] text-[length:var(--step-2)] text-[var(--paper)]">
              Ready when you are
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[var(--ink-10)]">
              Browse the catalogue, upload a prescription, or ask us to source something special.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/products"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand)] px-7 font-semibold text-[var(--brand-ink)] shadow-[var(--shadow-brand)] transition-[background-color,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-[var(--brand-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)]"
              >
                Browse all medicines
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/prescriptions"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--paper)]/25 px-6 font-semibold text-[var(--paper)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--paper)]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper)]"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload a prescription
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
