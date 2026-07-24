'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { SavingsCounter } from '@/components/account/SavingsCounter';

/**
 * Account settings — the retention hub. Shows the savings counter and lets the
 * customer turn refill reminders on/off (the one setting v1 exposes). Auth is
 * enforced by the API routes it calls; a signed-out visitor sees the sign-in
 * prompt rather than a broken toggle.
 */
export default function AccountSettingsPage() {
  const [optOut, setOptOut] = useState<boolean | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/account/preferences');
        if (res.status === 401) {
          setNeedsAuth(true);
          return;
        }
        if (res.ok) setOptOut((await res.json()).data.refillOptOut ?? false);
      } catch {
        /* leave loading state; user can retry */
      }
    })();
  }, []);

  async function toggle(next: boolean) {
    setSaving(true);
    setOptOut(next); // optimistic
    try {
      const res = await fetch('/api/account/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refillOptOut: next }),
      });
      if (!res.ok) setOptOut(!next); // revert on failure
    } catch {
      setOptOut(!next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-[length:var(--step-2)] font-extrabold text-[var(--ink)]">
        Account settings
      </h1>

      {needsAuth ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 text-center">
          <p className="text-[var(--ink)]">Sign in to manage your account.</p>
          <a
            href="/login"
            className="mt-3 inline-block rounded-[var(--radius-sm)] bg-[var(--mint)] px-4 py-2 font-semibold text-[var(--ink)]"
          >
            Sign in
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          <SavingsCounter />

          <section className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ink)]" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[var(--ink)]">Refill reminders</p>
                  <p className="mt-1 text-[length:var(--step--1)] text-[var(--ink-soft,var(--ink))]">
                    We'll email you before your regular medicines run out, based on your last order.
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={optOut === false}
                disabled={optOut === null || saving}
                onClick={() => toggle(!optOut)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                  optOut === false ? 'bg-[var(--mint)]' : 'bg-[var(--foil-soft)]'
                }`}
              >
                <span className="sr-only">Toggle refill reminders</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    optOut === false ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>

          <nav className="grid gap-2 sm:grid-cols-2">
            <AccountLink href="/orders" label="Order history" />
            <AccountLink href="/saved" label="Saved medicines" />
          </nav>
        </div>
      )}
    </div>
  );
}

function AccountLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-4 py-3 font-medium text-[var(--ink)] transition hover:border-[var(--mint)]"
    >
      {label}
    </a>
  );
}
