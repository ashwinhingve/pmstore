import Link from 'next/link';
import { NotFoundArt } from '@/components/illustrations';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--paper)] p-8 text-center">
      <NotFoundArt className="mb-8 w-64 sm:w-72" />
      <h1 className="mb-3 text-[length:var(--step-2)] text-[var(--ink)]">Page not found</h1>
      <p className="mb-8 max-w-sm text-[var(--ink-70)]">
        This page doesn&apos;t exist or has moved. The medicines are still where you left them.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/products"
          className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ink)] px-6 font-semibold text-[var(--paper-card)] shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--ink-deep)]"
        >
          Browse medicines
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-sm)] border-2 border-[var(--foil-soft)] bg-[var(--paper-card)] px-6 font-semibold text-[var(--ink)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)]"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
