import type { Metadata } from 'next';
import { Trash2, ShieldCheck, Mail } from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { DeleteAccountForm } from '@/components/account/DeleteAccountForm';
import { SITE_SHORT_NAME, CONTACT_EMAIL } from '@/lib/constants';
import { DELETION_REQUEST_SUBJECT } from '@/lib/account/deletion-request';

/**
 * Account deletion request — a public, Google Play compliant page.
 *
 * Reachable without signing in (Play requires a public URL for the deletion
 * path). It explains exactly what is deleted and what the pharmacy must retain
 * by law, then lets the visitor submit a request. Submitting does not delete
 * anything automatically — orders and prescription records are kept for their
 * legally required retention period and removed by hand afterwards. See
 * src/lib/account/deletion-request.ts and the /api/contact pipeline it reuses.
 */

export const metadata: Metadata = {
  title: 'Delete your account',
  description:
    'Request deletion of your PM Store account and personal data. Learn what is deleted, what records the pharmacy must keep by law, and how to send a deletion request.',
  alternates: { canonical: '/delete-account' },
  openGraph: {
    title: `Delete your ${SITE_SHORT_NAME} account`,
    description:
      'Request deletion of your account and personal data, and see what records the pharmacy must retain by law.',
    url: '/delete-account',
    type: 'website',
  },
};

const DELETED = [
  'Your profile — name, email and phone number',
  'Saved medicines and refill reminders',
  'Saved delivery addresses',
  'Account preferences and sign-in details',
];

const RETAINED = [
  'Prescription images for Schedule H / H1 / X medicines',
  'Order, billing and payment records',
];

const supportMailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  DELETION_REQUEST_SUBJECT,
)}`;

export default function DeleteAccountPage() {
  return (
    <div className="bg-[var(--paper)]">
      <section className="border-b border-[var(--foil-soft)] bg-[var(--paper-tint)]">
        <Container className="py-14 md:py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand)]">
            Account
          </p>
          <h1 className="max-w-3xl text-[length:var(--step-3)] text-[var(--ink)]">
            Delete your account
          </h1>
          <p className="mt-4 max-w-2xl text-[length:var(--step-1)] text-[var(--ink-70)]">
            You can ask us to delete your {SITE_SHORT_NAME} account and the personal data tied to
            it. Send the request below and our team will take care of it — nothing is deleted
            automatically.
          </p>
        </Container>
      </section>

      <section>
        <Container className="py-12 sm:py-14">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* What gets deleted */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-soft)] text-[var(--brand)]">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mb-3 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">
                What we delete
              </h2>
              <ul className="space-y-2 text-sm leading-relaxed text-[var(--ink-70)]">
                {DELETED.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* What is retained */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--foil-soft)] text-[var(--ink)]">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mb-3 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">
                What we must keep, and why
              </h2>
              <p className="mb-3 text-sm leading-relaxed text-[var(--ink-70)]">
                As a pharmacy we are legally required to keep some records even after you leave.
                These are retained for the minimum period the law requires — pharmacy and tax rules
                — and then deleted. They are never used to market to you.
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-[var(--ink-70)]">
                {RETAINED.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ink-40)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-[var(--foil-soft)]">
        <Container className="py-12 sm:py-14">
          <div className="max-w-2xl">
            <h2 className="mb-2 text-[length:var(--step-1)] text-[var(--ink)]">
              Send a deletion request
            </h2>
            <p className="mb-6 text-[var(--ink-70)]">
              Tell us the email you sign in with and we&apos;ll process the deletion. You don&apos;t
              need to be signed in.
            </p>
            <DeleteAccountForm />

            <div className="mt-8 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-tint)] p-5">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ink)]" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-[var(--ink-70)]">
                Prefer email? Write to{' '}
                <a
                  href={supportMailto}
                  className="font-medium text-[var(--brand-deep)] underline underline-offset-4 hover:text-[var(--brand)]"
                >
                  {CONTACT_EMAIL}
                </a>{' '}
                from the address on your account and ask us to delete it.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
