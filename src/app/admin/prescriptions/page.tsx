import { requireStaff } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Prescription from '@/models/Prescription';

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
      <h1 className="mb-2 text-3xl font-bold">Prescription Queue</h1>
      <p className="mb-6 text-muted-foreground">
        Review and verify pending prescriptions. Oldest submissions appear first.
      </p>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-4 py-3 text-left font-semibold">Patient Name</th>
              <th className="px-4 py-3 text-left font-semibold">Doctor Name</th>
              <th className="px-4 py-3 text-left font-semibold">Submitted</th>
              <th className="px-4 py-3 text-center font-semibold">Images</th>
              <th className="px-4 py-3 text-center font-semibold">Build Cart</th>
              <th className="px-4 py-3 text-left font-semibold">Customer</th>
            </tr>
          </thead>
          <tbody>
            {serialized.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No pending prescriptions.
                </td>
              </tr>
            ) : (
              serialized.map((rx) => (
                <tr
                  key={rx._id}
                  className="border-b border-border hover:bg-muted/50"
                >
                  <td className="px-4 py-3">{rx.patientName || '—'}</td>
                  <td className="px-4 py-3">{rx.doctorName || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(rx.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-center">{rx.images.length}</td>
                  <td className="px-4 py-3 text-center">
                    {rx.buildCartRequested ? (
                      <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                        Yes
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {rx.userId ? (
                      <div className="text-xs">
                        <div className="font-medium">{rx.userId.name || 'No name'}</div>
                        <div className="text-muted-foreground">{rx.userId.email || 'No email'}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unknown</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* TODO: wire verify/reject buttons to /api/admin/prescriptions/[id]/verify|reject */}
      <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
        <strong>Note:</strong> Action buttons (Verify / Reject) to be wired in the next iteration.
        Use API routes directly or add a client component to this page.
      </div>
    </div>
  );
}
