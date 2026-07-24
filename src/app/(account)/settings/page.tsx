'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { SavingsCounter } from '@/components/account/SavingsCounter';
import { AccountShell } from '@/components/account/AccountShell';

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
    <AccountShell title="Account settings" description="Savings, reminders and preferences.">
      {needsAuth ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-8 text-center shadow-[var(--shadow-sm)]">
          <p className="text-[var(--ink)]">Sign in to manage your account.</p>
          <a
            href="/login?redirect=/settings"
            className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-[var(--ink)] px-5 font-semibold text-[var(--paper-card)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--ink-deep)]"
          >
            Sign in
          </a>
        </div>
      ) : (
        <div className="max-w-2xl space-y-6">
          <SavingsCounter />

          <section className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-5 shadow-[var(--shadow-sm)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ink)]" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-[var(--ink)]">Refill reminders</p>
                  <p className="mt-1 text-[length:var(--step--1)] text-[var(--ink-70)]">
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
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-[var(--dur-fast)] disabled:opacity-50 ${
                  optOut === false ? 'bg-[var(--mint)]' : 'bg-[var(--foil)]'
                }`}
              >
                <span className="sr-only">Toggle refill reminders</span>
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-[var(--paper-card)] shadow-[var(--shadow-xs)] transition-transform duration-[var(--dur-fast)] ${
                    optOut === false ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>
        </div>
      )}
    </AccountShell>
  );
}
