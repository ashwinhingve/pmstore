import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { CONTACT } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Drug Licence & Compliance — Pratigya Medical Store',
  description:
    'Drug licence details and regulatory compliance for Pratigya Medical Store under the Drugs & Cosmetics Act, 1940.',
};

/**
 * Drug-licence disclosure — a legal requirement for an online pharmacy in India.
 * The licence numbers and pharmacist details below are PLACEHOLDERS: the store
 * owner must replace them with the real registered values before go-live. We do
 * not ship invented credentials — a wrong licence number is worse than none.
 */
export default function DrugLicencePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-soft)]">
          <ShieldCheck className="h-6 w-6 text-[var(--brand)]" aria-hidden="true" />
        </span>
        <h1 className="text-[length:var(--step-3)] text-[var(--ink)]">
          Drug licence &amp; compliance
        </h1>
      </div>

      <p className="mb-8 text-[var(--ink)]">
        Pratigya Medical Store operates as a licensed pharmacy under the Drugs &amp; Cosmetics
        Act, 1940 and the Pharmacy Act, 1948. Prescription (Schedule H, H1 and X) medicines are
        dispensed only against a valid prescription verified by our registered pharmacist.
      </p>

      <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]">
        <Detail label="Legal entity" value="Pratigya Medical Store" />
        <Detail label="Retail drug licence no." value="[To be added before go-live]" placeholder />
        <Detail label="Wholesale drug licence no." value="[To be added before go-live]" placeholder />
        <Detail label="Registered pharmacist" value="[Name — to be added]" placeholder />
        <Detail label="Pharmacist registration no." value="[State Pharmacy Council reg. no. — to be added]" placeholder />
        <Detail label="Licensing authority" value="Food &amp; Drug Administration, Madhya Pradesh" />
        <Detail label="Registered address" value="Madhya Pradesh, India" />
      </section>

      <div className="mt-8 rounded-[var(--radius-md)] border-l-4 border-[var(--rx)] bg-[var(--paper-card)] p-5">
        <h2 className="mb-2 font-bold text-[var(--ink)]">Prescription medicines</h2>
        <p className="text-[length:var(--step--1)] text-[var(--ink)]">
          Medicines marked with a red prescription flag cannot be purchased without uploading a
          valid prescription. Our pharmacist reviews every prescription before the order is
          dispatched. Self-medication with prescription drugs can be dangerous — always consult a
          registered medical practitioner.
        </p>
      </div>

      <p className="mt-8 text-[length:var(--step--1)] text-[var(--ink-70)]">
        For any compliance query, contact us at{' '}
        <a href={CONTACT.emailHref} className="underline">
          {CONTACT.email}
        </a>
        .
      </p>
    </div>
  );
}

function Detail({ label, value, placeholder }: { label: string; value: string; placeholder?: boolean }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-[length:var(--step--1)] font-medium text-[var(--ink-70)]">{label}</span>
      <span className={`text-[var(--ink)] ${placeholder ? 'italic opacity-70' : 'font-semibold'}`}>{value}</span>
    </div>
  );
}
