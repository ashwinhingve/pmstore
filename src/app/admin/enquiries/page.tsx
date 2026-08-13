import { requireAdmin } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Enquiry from '@/models/Enquiry';
import { ENQUIRY_STATUSES } from '@/lib/validations/contact';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import EnquiriesTable from '@/components/admin/EnquiriesTable';

export const metadata = { title: 'Enquiries' };

interface SearchParams {
  page?: string;
  status?: string;
  search?: string;
}

const PER_PAGE = 20;

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  await connectDB();

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const status =
    params.status && (ENQUIRY_STATUSES as readonly string[]).includes(params.status)
      ? params.status
      : '';
  const search = (params.search || '').trim();
  const skip = (page - 1) * PER_PAGE;

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (search) {
    const rx = { $regex: search, $options: 'i' };
    query.$or = [{ name: rx }, { phone: rx }, { email: rx }, { subject: rx }, { message: rx }];
  }

  const [rows, total, statusAgg] = await Promise.all([
    Enquiry.find(query).sort({ createdAt: -1 }).skip(skip).limit(PER_PAGE).lean(),
    Enquiry.countDocuments(query),
    Enquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const enquiries = rows.map((o: any) => ({
    id: o._id.toString(),
    name: o.name || '',
    email: o.email || '',
    phone: o.phone || '',
    subject: o.subject || '',
    message: o.message || '',
    source: (o.source || 'contact') as 'contact' | 'footer',
    status: (o.status || 'new') as 'new' | 'read' | 'replied' | 'closed',
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : '',
  }));

  const counts: Record<string, number> = {};
  for (const s of statusAgg) counts[s._id] = s.count;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Enquiries"
        description={
          <>
            Messages from the contact form (
            <span style={{ fontFamily: 'var(--font-data)' }}>{total.toLocaleString('en-IN')}</span>{' '}
            total). Reply to the customer, then move each one to{' '}
            <span className="font-medium">replied</span> or{' '}
            <span className="font-medium">closed</span>.
          </>
        }
      />

      <EnquiriesTable
        enquiries={enquiries}
        counts={counts}
        total={total}
        currentPage={page}
        totalPages={totalPages}
        filters={{ status, search }}
      />
    </div>
  );
}
