"use client";

import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-[var(--paper)]">
      <h2 className="text-3xl font-bold mb-4 text-[var(--ink)]">Something went wrong</h2>
      <p className="text-[var(--ink-70)] mb-6 max-w-sm text-center">{error.message}</p>
      <Button
        onClick={() => reset()}
        size="lg"
      >
        Try again
      </Button>
    </div>
  );
}
