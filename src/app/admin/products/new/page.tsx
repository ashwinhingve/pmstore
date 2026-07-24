import { requireAdmin } from '@/lib/auth-helpers';
import ProductForm from '@/components/admin/products/ProductForm';

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <div className="p-6 bg-[var(--paper)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--ink)]">
          Create New Product
        </h1>
        <p className="text-[var(--ink-70)] mt-2">
          Add a new product to your catalog
        </p>
      </div>

      <ProductForm mode="create" />
    </div>
  );
}
