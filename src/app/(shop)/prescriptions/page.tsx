import Link from 'next/link';
import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Prescription from '@/models/Prescription';
import { PrescriptionUpload } from '@/components/prescriptions/PrescriptionUpload';

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

export default async function PrescriptionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold text-[var(--ink)]">Upload a prescription</h1>
        <p className="mt-3 text-[var(--ink-70)]">
          Sign in to upload a prescription and track its review.
        </p>
        <Link
          href="/login?redirect=/prescriptions"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-[var(--radius-pill)] bg-[var(--ink)] px-6 py-2.5 font-semibold text-white"
        >
          Sign in
        </Link>
      </main>
    );
  }

  await connectDB();
  const prescriptions = await Prescription.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-[var(--ink)]">Upload a prescription</h1>
      <p className="mt-2 text-[var(--ink-70)]">
        Add clear photos of your prescription. A pharmacist reviews every one before dispatch.
      </p>

      <section className="mt-6">
        <PrescriptionUpload />
      </section>

      {prescriptions.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Your prescriptions</h2>
          <ul className="mt-4 space-y-3">
            {prescriptions.map((p) => {
              const id = String(p._id);
              const first = p.images?.[0]?.url;
              return (
                <li
                  key={id}
                  className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--line,#d9d9d9)] p-3"
                >
                  {first && (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-input,0.5rem)]">
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
                  <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--paper-card,#f4f4f2)] px-3 py-1 text-sm font-medium text-[var(--ink)]">
                    {STATUS_COPY[p.status] ?? p.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
