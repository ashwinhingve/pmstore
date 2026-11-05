'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/store/useToastStore';
import {
  DELETION_REQUEST_SUBJECT,
  buildDeletionRequestMessage,
} from '@/lib/account/deletion-request';

/**
 * Account deletion request form. Public — works signed in or out. When the
 * visitor is signed in we prefill their account email (and name) so the request
 * is tied to the right account; a signed-out visitor types the email they use
 * to sign in.
 *
 * Submitting does NOT delete anything. It sends a request to the store through
 * the existing contact pipeline (`POST /api/contact`): the request is stored in
 * the admin enquiry queue and emailed to the pharmacy, who action it by hand
 * while honouring records they must retain by law. This keeps the flow to one
 * well-tested backend and never auto-deletes orders or prescription records.
 */
export function DeleteAccountForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot — real users leave empty
  const [errors, setErrors] = useState<{ email?: string; confirmed?: string }>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle');

  // Prefill from the signed-in account, if any. A signed-out visitor (401) just
  // gets an empty form — this page is intentionally public.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/account/profile');
        if (!res.ok) return;
        const { data } = await res.json();
        if (data?.email) setEmail(data.email);
        if (data?.fullName) setName(data.fullName);
      } catch {
        /* leave the form empty; the visitor can type their email */
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedEmail = email.trim();
    const nextErrors: { email?: string; confirmed?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Enter the email you use to sign in.';
    }
    if (!confirmed) {
      nextErrors.confirmed = 'Please confirm you understand before sending.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus('submitting');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || trimmedEmail,
          email: trimmedEmail,
          subject: DELETION_REQUEST_SUBJECT,
          message: buildDeletionRequestMessage({ accountEmail: trimmedEmail, reason }),
          source: 'contact',
          website,
        }),
      });

      if (res.ok) {
        setStatus('sent');
        return;
      }
      if (res.status === 429) {
        toast.error('Too many requests. Wait a little while and try again.');
      } else {
        toast.error("Couldn't send your request. Try again, or email us directly.");
      }
      setStatus('error');
    } catch {
      toast.error("Couldn't send your request. Check your connection and try again.");
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[var(--brand)]" aria-hidden="true" />
          <div>
            <h3 className="text-[length:var(--step-0)] font-semibold text-[var(--ink)]">
              Your deletion request has been received
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-70)]">
              Our team will review it and delete your account and personal data, keeping only the
              records we are required to retain by law. We&apos;ll email{' '}
              <span style={{ fontFamily: 'var(--font-data)' }}>{email.trim()}</span> once it is
              done. This usually takes a few working days.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-5 rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]"
    >
      <label className="block">
        <span className="mb-1.5 block font-medium text-[var(--ink)]">Account email</span>
        <Input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          maxLength={254}
          placeholder="you@example.com"
          required
        />
        <span className="mt-1 block text-[length:var(--step--1)] text-[var(--ink-70)]">
          The email you use to sign in, so we can find your account.
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block font-medium text-[var(--ink)]">
          Reason <span className="text-[var(--ink-40)]">(optional)</span>
        </span>
        <Textarea
          name="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={2000}
          placeholder="Anything you'd like us to know. You can leave this blank."
        />
      </label>

      <Checkbox
        name="confirm"
        checked={confirmed}
        onChange={(e) => setConfirmed(e.target.checked)}
        error={errors.confirmed}
        label={
          <>
            I understand this requests deletion of my account and personal data, and that records
            the pharmacy must keep by law are retained for the required period and then deleted.
          </>
        }
      />

      {/* Honeypot: hidden from real users; bots fill it and are silently ignored. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      <Button type="submit" variant="destructive" loading={status === 'submitting'}>
        Request account deletion
      </Button>
    </form>
  );
}
