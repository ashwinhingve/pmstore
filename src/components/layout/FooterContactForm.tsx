'use client';

import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

/**
 * FooterContactForm — a compact contact form that sits in the footer so a
 * customer can send a question from any page without hunting for the /contact
 * page. Posts to the same POST /api/contact as the full page (tagged
 * source: 'footer'), so every message is stored to the admin Enquiries queue and
 * emailed to the shop. Includes a honeypot; never renders or logs PII.
 */

type Status = 'idle' | 'sending' | 'sent' | 'error';

const fieldClass =
  'min-h-11 w-full rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-3 py-2 text-sm text-[var(--ink)] outline-none transition-colors duration-[var(--dur-fast)] focus:border-[var(--brand)]';
const labelClass = 'mb-1 block text-xs font-semibold text-[var(--ink-70)]';

export function FooterContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'sending') return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus('sending');
    setError(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name') || ''),
          email: String(data.get('email') || ''),
          phone: String(data.get('phone') || ''),
          message: String(data.get('message') || ''),
          website: String(data.get('website') || ''),
          source: 'footer',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message || 'Could not send your message. Try again.');
        setStatus('error');
        return;
      }
      form.reset();
      setStatus('sent');
    } catch {
      setError('Connection error. Check your network and try again.');
      setStatus('error');
    }
  };

  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--paper-card)] p-5 text-[var(--ink)] shadow-[var(--shadow-md)] sm:p-6">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight text-[var(--ink)]">
        Send us a message
      </h3>
      <p className="mt-1 text-sm text-[var(--ink-70)]">
        Questions about a medicine, an order or delivery? We usually reply within a day.
      </p>

      {status === 'sent' ? (
        <div
          role="status"
          className="mt-4 flex items-start gap-2 rounded-[var(--radius-sm)] bg-[var(--mint-soft)] px-4 py-3 text-sm text-[var(--ink)]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--mint)]" aria-hidden="true" />
          <span>Thanks — your message is on its way. We&rsquo;ll be in touch soon.</span>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 space-y-3" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="footer-name">
                Name
              </label>
              <input id="footer-name" name="name" type="text" required autoComplete="name" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="footer-email">
                Email
              </label>
              <input id="footer-email" name="email" type="email" required autoComplete="email" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="footer-phone">
                Phone <span className="font-normal text-[var(--ink-40)]">(optional)</span>
              </label>
              <input id="footer-phone" name="phone" type="tel" autoComplete="tel" className={fieldClass} />
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="footer-message">
              Message
            </label>
            <textarea id="footer-message" name="message" required rows={3} className={`${fieldClass} resize-y`} />
          </div>

          {/* Honeypot — hidden from real users; bots fill it and get silently dropped. */}
          <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
            <label htmlFor="footer-website">Leave this field empty</label>
            <input id="footer-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          {error && (
            <p role="alert" className="text-sm text-[var(--ink)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--brand)] px-5 text-sm font-semibold text-[var(--brand-ink)] transition-opacity duration-[var(--dur-fast)] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {status === 'sending' ? 'Sending…' : 'Send message'}
          </button>
        </form>
      )}
    </div>
  );
}
