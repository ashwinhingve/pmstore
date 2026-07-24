'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { AccountShell } from '@/components/account/AccountShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Skeleton } from '@/components/ui/skeleton';

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
    <AccountShell title="Your profile" description="Your name and contact details.">
      {needsAuth ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-8 text-center shadow-[var(--shadow-sm)]">
          <p className="text-[var(--ink)]">Sign in to view your profile.</p>
          <a
            href="/login?redirect=/profile"
            className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-[var(--ink)] px-5 font-semibold text-[var(--paper-card)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--ink-deep)]"
          >
            Sign in
          </a>
        </div>
      ) : profile === null ? (
        <div className="max-w-xl space-y-4" aria-hidden="true">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-11 w-36" />
        </div>
      ) : (
        <form
          onSubmit={save}
          className="max-w-xl space-y-5 rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]"
        >
          <label className="block">
            <span className="mb-1.5 block font-medium text-[var(--ink)]">Email</span>
            <Input
              type="email"
              value={profile.email ?? ''}
              readOnly
              className="cursor-not-allowed bg-[var(--foil-soft)]"
            />
            <span className="mt-1 block text-[length:var(--step--1)] text-[var(--ink-70)]">
              Used to sign in — contact us to change it.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-medium text-[var(--ink)]">Full name</span>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={120}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-medium text-[var(--ink)]">Phone number</span>
            <PhoneInput
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              maxLength={20}
            />
          </label>

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              loading={status === 'saving'}
              className="bg-[var(--mint)] text-[var(--paper-card)] hover:bg-[var(--mint-deep)]"
            >
              Save changes
            </Button>
            {status === 'saved' && (
              <span className="flex items-center gap-1 text-[length:var(--step--1)] text-[var(--mint)]">
                <Check className="h-4 w-4" aria-hidden="true" /> Saved
              </span>
            )}
            {status === 'error' && (
              <span className="text-[length:var(--step--1)] font-semibold text-[var(--ink)]" role="alert">
                Could not save. Try again.
              </span>
            )}
          </div>
        </form>
      )}
    </AccountShell>
  );
}
