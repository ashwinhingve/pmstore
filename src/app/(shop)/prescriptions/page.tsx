import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Prescription from '@/models/Prescription';
import { PrescriptionUpload } from '@/components/prescriptions/PrescriptionUpload';
import { PrescriptionArt } from '@/components/illustrations';

export const metadata = {
  title: 'Upload prescription',
  description: 'Send us your prescription and our pharmacist will review it.',
};

const STATUS_COPY: Record<string, string> = {
  pending: 'Under review',
  verified: 'Verified',
  rejected: 'Not accepted',
  expired: 'Expired',
};

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-[var(--foil-soft)] text-[var(--ink-70)]',
  verified: 'bg-[var(--mint-soft)] text-[var(--mint)]',
  rejected: 'bg-[var(--foil-soft)] text-[var(--ink-70)]',
  expired: 'bg-[var(--foil-soft)] text-[var(--ink-40)]',
};

export default async function PrescriptionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-6 py-12 text-center shadow-[var(--shadow-sm)]">
          <PrescriptionArt className="mx-auto mb-6 w-44" />
          <h1 className="text-[length:var(--step-2)] text-[var(--ink)]">Upload a prescription</h1>
          <p className="mx-auto mt-3 max-w-sm text-[var(--ink-70)]">
            Sign in to upload a prescription and track its review.
          </p>
          <Link
            href="/login?redirect=/prescriptions"
            className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-[var(--ink)] px-6 py-2.5 font-semibold text-[var(--paper-card)] shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--ink-deep)]"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  await connectDB();
  const prescriptions = await Prescription.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[length:var(--step-2)] text-[var(--ink)]">Upload a prescription</h1>
          <p className="mt-2 text-[var(--ink-70)]">
            Add clear photos of your prescription. A pharmacist reviews every one before dispatch.
          </p>
        </div>
        <PrescriptionArt className="hidden w-28 shrink-0 sm:block" />
      </div>

      <section className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
        <PrescriptionUpload />
        <ul className="mt-4 space-y-1 text-sm text-[var(--ink-70)]">
          <li>· JPG, PNG or PDF, up to 5 MB per image</li>
          <li>· The doctor&apos;s name and date must be readable</li>
          <li>· We review within 24 hours and message you if anything is unclear</li>
        </ul>
      </section>

      {prescriptions.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[length:var(--step-1)] text-[var(--ink)]">Your prescriptions</h2>
          <ul className="mt-4 space-y-3">
            {prescriptions.map((p) => {
              const id = String(p._id);
              const first = p.images?.[0]?.url;
              return (
                <li
                  key={id}
                  className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-3 shadow-[var(--shadow-xs)]"
                >
                  {first && (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--paper-tint)]">
                      <Image src={first} alt="" fill sizes="56px" className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="data text-sm text-[var(--ink)]">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-[var(--ink-70)]">
                      {p.images?.length ?? 0} image{(p.images?.length ?? 0) === 1 ? '' : 's'}
                      {p.rejectionReason ? ` · ${p.rejectionReason}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-[var(--radius-pill)] px-3 py-1 text-sm font-medium ${
                      STATUS_TONE[p.status] ?? 'bg-[var(--foil-soft)] text-[var(--ink)]'
                    }`}
                  >
                    {STATUS_COPY[p.status] ?? p.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
