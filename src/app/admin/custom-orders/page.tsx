import { requireAdmin } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import CustomOrder from '@/models/CustomOrder';
import { CUSTOM_ORDER_STATUSES } from '@/lib/validations/custom-order';
import CustomOrdersTable from '@/components/admin/CustomOrdersTable';

export const metadata = { title: 'Custom orders' };

interface SearchParams {
  page?: string;
  status?: string;
  search?: string;
}

const PER_PAGE = 20;

export default async function AdminCustomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  await connectDB();

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const status =
    params.status && (CUSTOM_ORDER_STATUSES as readonly string[]).includes(params.status)
      ? params.status
      : '';
  const search = (params.search || '').trim();
  const skip = (page - 1) * PER_PAGE;

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (search) {
    const rx = { $regex: search, $options: 'i' };
    query.$or = [{ name: rx }, { phone: rx }, { email: rx }, { medicines: rx }];
  }

  const [rows, total, statusAgg] = await Promise.all([
    CustomOrder.find(query).sort({ createdAt: -1 }).skip(skip).limit(PER_PAGE).lean(),
    CustomOrder.countDocuments(query),
    CustomOrder.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const orders = rows.map((o: any) => ({
    id: o._id.toString(),
    name: o.name || '',
    phone: o.phone || '',
    email: o.email || '',
    medicines: o.medicines || '',
    quantity: o.quantity || '',
    deliveryArea: [o.deliveryArea, o.pincode].filter(Boolean).join(', '),
    hasPrescription: !!o.hasPrescription,
    notes: o.notes || '',
    status: (o.status || 'new') as 'new' | 'contacted' | 'closed',
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : '',
  }));

  const counts: Record<string, number> = {};
  for (const s of statusAgg) counts[s._id] = s.count;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--ink)]">Custom orders</h1>
        <p className="mt-1 text-sm text-[var(--ink-70)]">
          Customer requests for medicines to source (
          <span style={{ fontFamily: 'var(--font-data)' }}>{total.toLocaleString('en-IN')}</span> total).
          Call the customer, then move each one to <span className="font-medium">contacted</span> or{' '}
          <span className="font-medium">closed</span>.
        </p>
      </div>

      <CustomOrdersTable
        orders={orders}
        counts={counts}
        total={total}
        currentPage={page}
        totalPages={totalPages}
        filters={{ status, search }}
      />
    </div>
  );
}
