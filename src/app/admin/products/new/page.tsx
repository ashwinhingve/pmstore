import { requireAdmin } from '@/lib/auth-helpers';
import ProductForm from '@/components/admin/products/ProductForm';

export default async function NewProductPage() {
  await requireAdmin();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-red-700 bg-clip-text text-transparent">
          Create New Product
        </h1>
        <p className="text-gray-600 mt-2">
          Add a new product to your catalog
        </p>
      </div>

      <ProductForm mode="create" />
    </div>
  );
}
