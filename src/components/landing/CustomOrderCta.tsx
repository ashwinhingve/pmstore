import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Upload, PackageSearch, Clock } from 'lucide-react';
import { Container } from '@/components/shared/Container';

/**
 * CustomOrderCta — the request-a-medicine feature band below the category grid,
 * and the home page's primary "highlight custom order" surface (client priority).
 * A two-column navy card: the ask + actions on the left, a pharmacist photo with
 * a "~1-day callback" chip on the right. Server-safe: links + one image, no state.
 *
 * Sits on a --paper-tint band so it alternates against Categories (paper) above
 * and QuickActions below.
 */
export function CustomOrderCta() {
  return (
    <section className="bg-[var(--paper-tint)]">
      <Container className="py-16 sm:py-24">
        <div className="relative isolate grid overflow-hidden rounded-[var(--radius-lg)] bg-[image:var(--surface-hero)] shadow-[var(--shadow-feature)] lg:grid-cols-2">
          {/* Oversized, low-contrast glyph anchored bottom-left of the text side. */}
          <PackageSearch
            className="pointer-events-none absolute -bottom-8 left-4 h-52 w-52 text-[var(--paper)]/[0.04]"
            strokeWidth={1}
            aria-hidden="true"
          />

          {/* Left — the ask + actions */}
          <div className="relative order-2 px-6 py-10 sm:px-10 sm:py-14 lg:order-1">
            <span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--paper)]/10 px-3 py-1 text-sm font-semibold text-[var(--brand-ink)] ring-1 ring-inset ring-[var(--paper)]/15">
              <PackageSearch className="h-4 w-4" aria-hidden="true" />
              Can’t find it?
            </span>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-[length:var(--step-2)] text-[var(--paper)]">
              Tell us the medicine — we’ll source it for you
            </h2>
            <p className="mt-3 max-w-md text-[var(--ink-10)]">
              Send the name, a photo of the pack, or your doctor’s list. Our pharmacist checks
              availability and calls you back, usually within a working day.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/custom-order"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand)] px-7 font-semibold text-[var(--brand-ink)] shadow-[var(--shadow-brand)] transition-[background-color,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-[var(--brand-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)]"
              >
                Request a medicine
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/prescriptions"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--paper)]/25 px-6 font-semibold text-[var(--paper)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--paper)]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper)]"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload a prescription
              </Link>
              <Link
                href="/products"
                className="inline-flex h-12 items-center justify-center px-2 font-semibold text-[var(--paper)]/85 underline-offset-4 transition-colors duration-[var(--dur-fast)] hover:text-[var(--paper)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper)]"
              >
                Browse all
              </Link>
            </div>
          </div>

          {/* Right — pharmacist photo with a callback chip */}
          <div className="relative order-1 min-h-[220px] lg:order-2 lg:min-h-0">
            <Image
              src="/landing/trust-1.jpg"
              alt="Pharmacist at the counter, ready to help source your medicine"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            {/* Blend the photo into the navy card: top-fade on mobile, left-fade on desktop. */}
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--ink-deep)] via-[var(--ink)]/20 to-transparent lg:bg-gradient-to-r lg:from-[var(--ink-deep)] lg:via-[var(--ink)]/10 lg:to-transparent" />
            <div className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--paper-card)] px-3 py-1.5 shadow-[var(--shadow-md)]">
              <Clock className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
              <span className="text-sm font-semibold text-[var(--ink)]">~1-day callback</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
