"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorArt } from '@/components/illustrations';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--paper)] p-8 text-center">
      <ErrorArt className="mb-6 w-52" />
      <h2 className="mb-3 text-[length:var(--step-2)] text-[var(--ink)]">
        Something went wrong
      </h2>
      <p className="mb-8 max-w-sm text-[var(--ink-70)]">
        The page hit a problem it couldn&apos;t recover from. Try again, or head back to the
        home page.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => reset()} size="lg">
          Try again
        </Button>
        <Link href="/">
          <Button variant="outline" size="lg" className="w-full">
            Go home
          </Button>
        </Link>
      </div>
    </div>
  );
}
