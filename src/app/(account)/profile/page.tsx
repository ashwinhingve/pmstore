'use client';

import { useEffect, useState } from 'react';
import { User as UserIcon, Check } from 'lucide-react';

interface Profile {
  email: string | null;
  fullName: string;
  phoneNumber: string;
  role: string;
  emailVerified: boolean;
  mobileVerified: boolean;
}

/**
 * Customer profile — view and edit display name + phone. Email and role are
 * read-only (email is the login identity; role is admin-controlled).
 */
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/account/profile');
        if (res.status === 401) {
          setNeedsAuth(true);
          return;
        }
        if (res.ok) {
          const { data } = await res.json();
          setProfile(data);
          setFullName(data.fullName ?? '');
          setPhoneNumber(data.phoneNumber ?? '');
        }
      } catch {
        setStatus('error');
      }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving');
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phoneNumber }),
      });
      setStatus(res.ok ? 'saved' : 'error');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2 text-[length:var(--step-2)] font-extrabold text-[var(--ink)]">
        <UserIcon className="h-6 w-6" aria-hidden="true" /> My profile
      </h1>

      {needsAuth ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 text-center">
          <p className="text-[var(--ink)]">Sign in to view your profile.</p>
          <a
            href="/login"
            className="mt-3 inline-block rounded-[var(--radius-sm)] bg-[var(--mint)] px-4 py-2 font-semibold text-[var(--ink)]"
          >
            Sign in
          </a>
        </div>
      ) : profile === null ? (
        <div className="space-y-4" aria-hidden="true">
          <div className="h-11 animate-pulse rounded bg-[var(--foil-soft)]" />
          <div className="h-11 animate-pulse rounded bg-[var(--foil-soft)]" />
        </div>
      ) : (
        <form onSubmit={save} className="space-y-5">
          <Field label="Email" hint="Used to sign in — contact us to change it.">
            <input
              type="email"
              value={profile.email ?? ''}
              readOnly
              className="w-full cursor-not-allowed rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--foil-soft)] px-3 py-2 text-[var(--ink-soft,var(--ink))]"
            />
          </Field>

          <Field label="Full name">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={120}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)]"
            />
          </Field>

          <Field label="Phone number">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              maxLength={20}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)]"
            />
          </Field>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={status === 'saving'}
              className="rounded-[var(--radius-sm)] bg-[var(--mint)] px-5 py-2 font-semibold text-[var(--ink)] disabled:opacity-60"
            >
              {status === 'saving' ? 'Saving…' : 'Save changes'}
            </button>
            {status === 'saved' && (
              <span className="flex items-center gap-1 text-[length:var(--step--1)] text-[var(--ink)]">
                <Check className="h-4 w-4" aria-hidden="true" /> Saved
              </span>
            )}
            {status === 'error' && (
              <span className="text-[length:var(--step--1)] text-[var(--rx)]" role="alert">
                Could not save. Try again.
              </span>
            )}
          </div>

          <p className="pt-2 text-[length:var(--step--1)]">
            <a href="/settings" className="underline">Account settings &amp; refill reminders</a>
          </p>
        </form>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-medium text-[var(--ink)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[length:var(--step--1)] text-[var(--ink-soft,var(--ink))]">{hint}</span>}
    </label>
  );
}
