import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { CONTACT, LEGAL, SITE_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Drug Licence & Compliance | PM Store',
  description:
    'Drug licence details and regulatory compliance for Pratigya Medical Store under the Drugs & Cosmetics Act, 1940 — retail drug sale licences (Form 20 & 21), registered pharmacist and licensing authority.',
  alternates: { canonical: '/drug-licence' },
};

/**
 * Drug-licence disclosure — a legal requirement for an online pharmacy in India.
 * The licence numbers, pharmacist and registration details come from LEGAL in
 * src/lib/constants.ts, which is verified against the store's official documents.
 */
export default function DrugLicencePage() {
  const { drugLicence, pharmacist } = LEGAL;

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
        {SITE_NAME} operates as a licensed retail pharmacy under the Drugs &amp; Cosmetics
        Act, 1940 and the Pharmacy Act, 1948. Prescription (Schedule H, H1 and X) medicines are
        dispensed only against a valid prescription verified by our registered pharmacist before
        the order is delivered.
      </p>

      <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]">
        <Detail label="Legal entity" value={SITE_NAME} />
        <Detail label="Proprietor" value={LEGAL.proprietor} />
        <Detail label="Drug sale licence (Form 20 — general drugs)" value={drugLicence.form20} />
        <Detail label="Drug sale licence (Form 21 — Schedule C &amp; C1)" value={drugLicence.form21} />
        <Detail label="Licence valid up to" value={drugLicence.validTo} />
        <Detail
          label="Registered pharmacist"
          value={`${pharmacist.name}, ${pharmacist.qualification}`}
        />
        <Detail
          label="Pharmacist registration no."
          value={`${pharmacist.regNo} (valid to ${pharmacist.regValidTo})`}
        />
        <Detail label="Licensing authority" value={drugLicence.authority} />
        <Detail label="Udyam (MSME) registration" value={LEGAL.udyam} />
        <Detail label="MP Shops &amp; Establishments (Gumasta)" value={LEGAL.gumasta} />
        <Detail label="GSTIN" value="Not applicable" />
        <Detail label="Registered address" value={CONTACT.addressFull} />
      </section>

      <div className="mt-8 rounded-[var(--radius-md)] border-l-4 border-[var(--rx)] bg-[var(--paper-card)] p-5">
        <h2 className="mb-2 font-bold text-[var(--ink)]">Prescription medicines</h2>
        <p className="text-[length:var(--step--1)] text-[var(--ink)]">
          You can order scheduled (prescription) medicines through {SITE_NAME}. Uploading your
          prescription at checkout is optional — for any medicine that requires one, our registered
          pharmacist verifies a valid prescription before the order is dispatched and delivered.
          Self-medication with prescription drugs can be dangerous — always consult a registered
          medical practitioner.
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-[length:var(--step--1)] font-medium text-[var(--ink-70)]">{label}</span>
      <span className="font-semibold text-[var(--ink)]">{value}</span>
    </div>
  );
}
