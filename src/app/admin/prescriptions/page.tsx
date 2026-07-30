import Image from 'next/image';
import { requireStaff } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Prescription from '@/models/Prescription';
import { signedImageUrl } from '@/lib/cloudinary/config';
import { PrescriptionActions } from '@/components/admin/PrescriptionActions';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

interface PrescriptionQueueItem {
  _id: string;
  patientName?: string;
  doctorName?: string;
  createdAt: Date;
  images: Array<{ url: string; publicId: string }>;
  buildCartRequested: boolean;
  userId: {
    _id: string;
    name?: string;
    email?: string;
  } | null;
}

export const metadata = { title: 'Prescription Queue — Admin' };

export default async function AdminPrescriptionsPage() {
  await requireStaff();
  await connectDB();

  // Fetch the first 50 pending prescriptions, oldest first
  const prescriptions = await Prescription.find({ status: 'pending' })
    .sort({ createdAt: 1 })
    .limit(50)
    .populate('userId', 'name email')
    .lean<PrescriptionQueueItem[]>();

  // Serialize ObjectIds and mint a fresh signed URL per image — the stored
  // `url` is never directly browsable (health data, root CLAUDE.md rule #6).
  const serialized = prescriptions.map((rx) => ({
    ...rx,
    _id: String(rx._id),
    images: rx.images.map((img) => ({ ...img, url: signedImageUrl(img.publicId) })),
    userId: rx.userId
      ? { ...rx.userId, _id: String(rx.userId._id) }
      : null,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminPageHeader
        title="Prescription Queue"
        description="Review and verify pending prescriptions. Oldest submissions appear first."
      />

      <div className="overflow-x-auto rounded-lg border border-[var(--foil-soft)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--foil-soft)] bg-[var(--foil-soft)]">
              <th className="px-4 py-3 text-left font-semibold text-[var(--ink)]">Patient Name</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--ink)]">Doctor Name</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--ink)]">Submitted</th>
              <th className="px-4 py-3 text-center font-semibold text-[var(--ink)]">Images</th>
              <th className="px-4 py-3 text-center font-semibold text-[var(--ink)]">Build Cart</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--ink)]">Customer</th>
              <th className="px-4 py-3 text-left font-semibold text-[var(--ink)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {serialized.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--ink-70)]">
                  No pending prescriptions.
                </td>
              </tr>
            ) : (
              serialized.map((rx) => (
                <tr
                  key={rx._id}
                  className="border-b border-[var(--foil-soft)] hover:bg-[var(--foil-soft)]/50"
                >
                  <td className="px-4 py-3 text-[var(--ink)]">{rx.patientName || '—'}</td>
                  <td className="px-4 py-3 text-[var(--ink)]">{rx.doctorName || '—'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--ink-70)]">
                    {new Date(rx.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Kolkata',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      {rx.images.slice(0, 3).map((img, i) => (
                        <a
                          key={img.publicId}
                          href={img.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--foil-soft)] outline-offset-2 hover:border-[var(--brand)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                          aria-label={`Open prescription image ${i + 1} of ${rx.images.length}`}
                        >
                          <Image
                            src={img.url}
                            alt={`Prescription image ${i + 1} for ${rx.patientName || 'patient'}`}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        </a>
                      ))}
                      {rx.images.length > 3 && (
                        <span className="text-xs text-[var(--ink-70)]">+{rx.images.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {rx.buildCartRequested ? (
                      <span className="inline-block rounded bg-[var(--mint-soft)] px-2 py-1 text-xs font-semibold text-[var(--mint)]">
                        Yes
                      </span>
                    ) : (
                      <span className="text-[var(--ink-70)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {rx.userId ? (
                      <div className="text-xs">
                        <div className="font-medium text-[var(--ink)]">{rx.userId.name || 'No name'}</div>
                        <div className="text-[var(--ink-70)]">{rx.userId.email || 'No email'}</div>
                      </div>
                    ) : (
                      <span className="text-[var(--ink-70)]">Unknown</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PrescriptionActions prescriptionId={rx._id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
