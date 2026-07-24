import { requireAdmin } from '@/lib/auth-helpers';
import connectDB from '@/lib/mongodb/connection';
import Product from '@/models/Product';
import ProductForm from '@/components/admin/products/ProductForm';
import { notFound } from 'next/navigation';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  await connectDB();

  const product = await Product.findById(id).lean() as any;

  if (!product) {
    notFound();
  }

  // Serialize data
  const serializedProduct = JSON.parse(JSON.stringify(product));

  return (
    <div className="p-6 bg-[var(--paper)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--ink)]">
          Edit Product
        </h1>
        <p className="text-[var(--ink-70)] mt-2">
          Update product information for: <span className="font-medium">{product.name}</span>
        </p>
      </div>

      <ProductForm mode="edit" initialData={serializedProduct} />
    </div>
  );
}
