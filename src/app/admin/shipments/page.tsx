import { requireAdmin } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import Shipment from '@/models/Shipment';
import Order from '@/models/Order';
import ShipmentsTable from '@/components/admin/ShipmentsTable';

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default async function AdminShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  await connectDB();

  const params = await searchParams;

  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const skip = (page - 1) * limit;

  const search = params.search || '';
  const status = params.status || '';
  const dateFrom = params.dateFrom || '';
  const dateTo = params.dateTo || '';

  // ── Fetch shipments (existing) ──────────────────────────────────────────────
  const query: any = {};

  if (search) {
    const matchingOrders = await Order.find(
      { orderNumber: { $regex: search, $options: 'i' } },
      { _id: 1 }
    ).lean();
    const matchingOrderIds = matchingOrders.map((o: any) => o._id);

    if (matchingOrderIds.length > 0) {
      query.$or = [
        { waybill: { $regex: search, $options: 'i' } },
        { orderId: { $in: matchingOrderIds } },
      ];
    } else {
      query.waybill = { $regex: search, $options: 'i' };
    }
  }

  if (status) query.shipmentStatus = status;

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }

  const [shipments, totalShipments] = await Promise.all([
    Shipment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Shipment.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalShipments / limit);

  const shipmentsWithOrders = await Promise.all(
    shipments.map(async (shipment: any) => {
      const order = await Order.findById(shipment.orderId)
        .populate('userId', 'name email')
        .lean() as any;

      return {
        id: shipment._id.toString(),
        waybill: shipment.waybill,
        orderNumber: order?.orderNumber || 'N/A',
        orderId: order?._id.toString() || null,
        customerName: (order?.userId as any)?.name || 'N/A',
        customerEmail: (order?.userId as any)?.email || 'N/A',
        status: shipment.shipmentStatus,
        courier: shipment.courierName || '',
        provider: shipment.provider || 'delhivery',
        trackingUrl: shipment.trackingUrl || null,
        origin: null,
        destination: shipment.currentLocation || null,
        estimatedDelivery: null,
        deliveredAt: shipment.deliveryDate?.toISOString() || null,
        createdAt: shipment.createdAt.toISOString(),
        lastUpdated: shipment.updatedAt?.toISOString() || shipment.createdAt.toISOString(),
      };
    })
  );

  // ── Fetch pending COD orders (no shipment created yet) ──────────────────────
  const rawCodOrders = await Order.find({
    paymentMethod: 'cod',
    orderStatus: 'confirmed',
    paymentStatus: 'pending',
  })
    .populate('userId', 'name email')
    .populate('shippingAddressId', 'fullName phoneNumber')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean() as any[];

  // Filter out orders that already have a shipment (edge case)
  const codOrderIds = rawCodOrders.map((o: any) => o._id);
  const existingShipmentOrderIds = codOrderIds.length > 0
    ? (await Shipment.find({ orderId: { $in: codOrderIds } }, { orderId: 1 }).lean()).map(
        (s: any) => s.orderId.toString()
      )
    : [];
  const shippedSet = new Set(existingShipmentOrderIds);

  const pendingCodOrders = rawCodOrders
    .filter((o: any) => !shippedSet.has(o._id.toString()))
    .map((o: any) => ({
      id: o._id.toString(),
      orderNumber: o.orderNumber,
      customerName: (o.userId as any)?.name || (o.shippingAddressId as any)?.fullName || 'N/A',
      customerEmail: (o.userId as any)?.email || 'N/A',
      customerPhone: (o.shippingAddressId as any)?.phoneNumber || '',
      totalAmount: o.totalAmount,
      paymentMethod: 'cod' as const,
      createdAt: o.createdAt.toISOString(),
    }));

  // ── Stats ───────────────────────────────────────────────────────────────────
  const statusCounts = await Shipment.aggregate([
    { $group: { _id: '$shipmentStatus', count: { $sum: 1 } } },
  ]);

  const [inTransitCount, deliveredCount, failedCount] = await Promise.all([
    Shipment.countDocuments({ shipmentStatus: { $in: ['In Transit', 'Dispatched', 'Out for Delivery'] } }),
    Shipment.countDocuments({ shipmentStatus: 'Delivered' }),
    Shipment.countDocuments({ shipmentStatus: { $in: ['Cancelled', 'RTO', 'RTO Delivered', 'Lost', 'Damaged'] } }),
  ]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)]">Shipment management</h1>
          <p className="text-sm text-[var(--ink-70)] mt-1">
            Track and manage all shipments ({totalShipments.toLocaleString()} total)
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--paper-card)] border border-[var(--foil-soft)] rounded-lg text-sm font-medium text-[var(--ink)] hover:bg-[var(--foil-soft)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-5">
          <p className="text-sm text-[var(--ink-70)] mb-1">Total shipments</p>
          <p className="text-2xl font-bold text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>{totalShipments}</p>
        </div>
        <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-5">
          <p className="text-sm text-[var(--ink-70)] mb-1">In transit</p>
          <p className="text-2xl font-bold text-[var(--ink-70)] data" style={{ fontFamily: 'var(--font-data)' }}>{inTransitCount}</p>
        </div>
        <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-5">
          <p className="text-sm text-[var(--ink-70)] mb-1">Delivered</p>
          <p className="text-2xl font-bold text-[var(--mint)] data" style={{ fontFamily: 'var(--font-data)' }}>{deliveredCount}</p>
        </div>
        <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-5">
          <p className="text-sm text-[var(--ink-70)] mb-1">Failed/issues</p>
          <p className="text-2xl font-bold text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>{failedCount}</p>
        </div>
        <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-5">
          <p className="text-sm text-[var(--ink-70)] mb-1 font-medium">Awaiting shipment</p>
          <p className="text-2xl font-bold text-[var(--mint)] data" style={{ fontFamily: 'var(--font-data)' }}>{pendingCodOrders.length}</p>
        </div>
      </div>

      {/* Shipments Table (includes pending COD section) */}
      <ShipmentsTable
        shipments={shipmentsWithOrders}
        totalPages={totalPages}
        currentPage={page}
        filters={{ search, status, dateFrom, dateTo }}
        statusCounts={statusCounts}
        pendingOrders={pendingCodOrders}
      />
    </div>
  );
}
