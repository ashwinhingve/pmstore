import { requireAdmin } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import ProductsTable from '@/components/admin/ProductsTable';

interface SearchParams {
  page?: string;
  search?: string;
  category?: string;
  status?: string;
  stockLevel?: string;
  sortBy?: string;
  sortOrder?: string;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  // Await searchParams
  const params = await searchParams;

  // Parse query parameters
  const page = parseInt(params.page || '1', 10);
  const limit = 20;
  const search = params.search || '';
  const category = params.category || '';
  const status = params.status || 'all';
  const stockLevel = params.stockLevel || '';
  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

  let products: any[] = [];
  let total = 0;
  let categoryCounts: any[] = [];
  let statusCounts: any[] = [];
  let stockCounts: any[] = [];
  let dbError = false;

  try {
    await connectDB();

  // Build query
  const query: any = {};

  if (category) {
    query.category = category;
  }

  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (stockLevel === 'low') {
    query.stock = { $gt: 0, $lte: 10 };
  } else if (stockLevel === 'out') {
    query.stock = 0;
  } else if (stockLevel === 'available') {
    query.stock = { $gt: 10 };
  }

  // Build sort
  const sort: any = {};
  sort[sortBy] = sortOrder;

  const [dbProducts, dbTotal] = await Promise.all([
    Product.find(query)
      .select('-__v')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  products = dbProducts as any[];
  total = dbTotal;

  const [dbCategoryCounts, dbStatusCounts, dbStockCounts] = await Promise.all([
    Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Product.aggregate([
      {
        $group: {
          _id: '$isActive',
          count: { $sum: 1 },
        },
      },
    ]),
    Product.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$stock', 0] },
              'out',
              {
                $cond: [
                  { $lte: ['$stock', 10] },
                  'low',
                  'available',
                ],
              },
            ],
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  categoryCounts = dbCategoryCounts;
  statusCounts = dbStatusCounts;
  stockCounts = dbStockCounts;

  } catch (error: any) {
    console.error('Database error on admin products page:', error.message);
    dbError = true;
  }

  const pagination = {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };

  const filters = {
    categories: categoryCounts,
    statuses: statusCounts,
    stockLevels: stockCounts,
  };

  // Serialize data
  const serializedProducts = JSON.parse(JSON.stringify(products));

  return (
    <div className="p-6 bg-[var(--paper)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--ink)]">
          Product Management
        </h1>
        <p className="text-[var(--ink-70)] mt-2">
          Manage your product catalog, inventory, and pricing
        </p>
      </div>

      {dbError && (
        <div className="mb-6 bg-[var(--foil-soft)] border border-[var(--foil)] rounded-lg p-4">
          <p className="text-sm text-[var(--ink-70)] font-medium">
            Could not connect to the database. Please check your internet connection and try again.
          </p>
        </div>
      )}

      <ProductsTable
        products={serializedProducts}
        pagination={pagination}
        filters={filters}
        currentFilters={{
          search,
          category,
          status,
          stockLevel,
          sortBy,
          sortOrder: params.sortOrder || 'desc',
        }}
      />
    </div>
  );
}
