import { requireStaff } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Prescription from '@/models/Prescription';
import { PrescriptionActions } from '@/components/admin/PrescriptionActions';

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

  // Serialize ObjectIds
  const serialized = prescriptions.map((rx) => ({
    ...rx,
    _id: String(rx._id),
    userId: rx.userId
      ? { ...rx.userId, _id: String(rx.userId._id) }
      : null,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold text-[var(--ink)]">Prescription Queue</h1>
      <p className="mb-6 text-[var(--ink-70)]">
        Review and verify pending prescriptions. Oldest submissions appear first.
      </p>

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
                    })}
                  </td>
                  <td className="px-4 py-3 text-center text-[var(--ink)]">{rx.images.length}</td>
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
