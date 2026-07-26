import { requireAdmin } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import WholesaleEnquiry from '@/models/WholesaleEnquiry';
import { monthlyVolumeLabel, WHOLESALE_STATUSES } from '@/lib/validations/wholesale';
import WholesaleEnquiriesTable from '@/components/admin/WholesaleEnquiriesTable';

export const metadata = { title: 'Bulk orders' };

interface SearchParams {
  page?: string;
  status?: string;
  search?: string;
}

const PER_PAGE = 20;

export default async function AdminWholesaleEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  await connectDB();

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const status =
    params.status && (WHOLESALE_STATUSES as readonly string[]).includes(params.status)
      ? params.status
      : '';
  const search = (params.search || '').trim();
  const skip = (page - 1) * PER_PAGE;

  // Build query. Search spans the business and contact fields; anchored with
  // 'i' so an admin can paste a phone or email and find the enquiry.
  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (search) {
    const rx = { $regex: search, $options: 'i' };
    query.$or = [
      { businessName: rx },
      { contactPerson: rx },
      { email: rx },
      { phone: rx },
    ];
  }

  const [rows, total, statusAgg] = await Promise.all([
    WholesaleEnquiry.find(query).sort({ createdAt: -1 }).skip(skip).limit(PER_PAGE).lean(),
    WholesaleEnquiry.countDocuments(query),
    WholesaleEnquiry.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const enquiries = rows.map((e: any) => ({
    id: e._id.toString(),
    businessName: e.businessName || '',
    contactPerson: e.contactPerson || '',
    phone: e.phone || '',
    email: e.email || '',
    gstNumber: e.gstNumber || '',
    drugLicenseNumber: e.drugLicenseNumber || '',
    address: [e.addressLine, e.city, e.state, e.pincode].filter(Boolean).join(', '),
    productRequirements: e.productRequirements || '',
    quantity: e.quantity || '',
    preferredBrands: e.preferredBrands || '',
    monthlyVolume: monthlyVolumeLabel(e.monthlyVolume) || '',
    notes: e.notes || '',
    status: (e.status || 'new') as 'new' | 'contacted' | 'closed',
    createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : '',
  }));

  const counts: Record<string, number> = {};
  for (const s of statusAgg) counts[s._id] = s.count;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--ink)]">Bulk orders</h1>
        <p className="mt-1 text-sm text-[var(--ink-70)]">
          Wholesale and bulk-supply enquiries from the storefront (
          <span style={{ fontFamily: 'var(--font-data)' }}>{total.toLocaleString('en-IN')}</span> total).
          Reach out, then move each one to <span className="font-medium">contacted</span> or{' '}
          <span className="font-medium">closed</span>.
        </p>
      </div>

      <WholesaleEnquiriesTable
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
