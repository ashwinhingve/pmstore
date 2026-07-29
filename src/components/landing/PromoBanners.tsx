import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { PROMO_BANNERS } from '@/lib/landing-images';

/**
 * PromoBanners — two image-backed feature banners on a warm band. Each promotes
 * a real feature (prescription upload, one-tap reorder) and links to it — never
 * a fake coupon or sale (scope guard, docs/00-ARCHITECTURE.md). Server-safe:
 * no state, hover-only motion, images through next/image.
 */
export function PromoBanners() {
  return (
    <section className="bg-[var(--brand-tint)]">
      <Container className="py-16 sm:py-24">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {PROMO_BANNERS.map((banner) => (
            <article
              key={banner.title}
              className="group relative flex min-h-[240px] flex-col justify-center overflow-hidden rounded-[var(--radius-lg)] p-7 shadow-[var(--shadow-sm)] transition-shadow duration-[var(--dur-fast)] hover:shadow-[var(--shadow-md)] sm:p-9"
            >
              <Image
                src={banner.url}
                alt={banner.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] group-hover:scale-105"
              />
              {/* Photography leads: one ink scrim anchors the text on the left and
                  fades to reveal the photo on the right. */}
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)]/88 via-[var(--ink)]/45 to-transparent" />

              <div className="relative max-w-sm text-[var(--brand-ink)]">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-ink)]/85">
                  {banner.eyebrow}
                </span>
                <h3 className="mt-1.5 text-[length:var(--step-2)] text-[var(--brand-ink)]">
                  {banner.title}
                </h3>
                <p className="mt-2 text-[var(--brand-ink)]/90">{banner.body}</p>
                <Link
                  href={banner.ctaHref}
                  className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--brand-ink)] px-5 font-semibold text-[var(--brand-deep)] shadow-[var(--shadow-sm)] transition-[background-color,box-shadow] duration-[var(--dur-fast)] hover:bg-[var(--brand-ink)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)]"
                >
                  {banner.ctaText}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
