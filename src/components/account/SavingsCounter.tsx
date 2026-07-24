'use client';

import { useEffect, useState } from 'react';
import { PiggyBank } from 'lucide-react';

/**
 * "You've saved ₹X this year." A retention nudge that reads from
 * /api/account/savings. Deliberately quiet when there's nothing to show — a
 * ₹0 saving would read as a broken feature, so we hide the card entirely.
 */
export function SavingsCounter() {
  const [data, setData] = useState<{ total: number; year: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/account/savings');
        if (res.ok) setData((await res.json()).data);
      } catch {
        /* leave hidden on error */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  if (!loaded) {
    return <div className="h-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--foil-soft)]" aria-hidden="true" />;
  }
  if (!data || data.total <= 0) return null;

  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-md)] bg-[var(--mint)] p-5">
      <PiggyBank className="h-8 w-8 shrink-0 text-[var(--ink)]" aria-hidden="true" />
      <div>
        <p className="text-[length:var(--step-3)] font-extrabold leading-none text-[var(--ink)]">
          ₹{data.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </p>
        <p className="mt-1 text-[length:var(--step--1)] text-[var(--ink)]">
          saved on medicines in {data.year}
        </p>
      </div>
    </div>
  );
}
