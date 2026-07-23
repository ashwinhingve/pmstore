import Product from '@/models/Product';
import connectDB from '@/lib/mongodb/connection';

/**
 * Generate a unique SKU for a product
 * @param category - Product category
 * @param productName - Product name
 * @returns A unique SKU
 */
export function generateSKU(category: string, productName: string): string {
  const categoryPrefix = category.substring(0, 3).toUpperCase();
  const namePrefix = productName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 3)
    .toUpperCase();

  const timestamp = Date.now().toString(36).toUpperCase().substring(7);

  return `TAPTI-${categoryPrefix}-${namePrefix}-${timestamp}`;
}

/**
 * Ensure a SKU is unique by checking the database
 * @param baseSKU - The base SKU to check
 * @param excludeId - Optional product ID to exclude from uniqueness check (for updates)
 * @returns A unique SKU
 */
export async function ensureUniqueSKU(
  baseSKU: string,
  excludeId?: string
): Promise<string> {
  await connectDB();

  let sku = baseSKU.toUpperCase();
  let counter = 1;

  while (true) {
    const query: any = { sku };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existing = await Product.findOne(query);

    if (!existing) {
      return sku;
    }

    // If SKU exists, append counter
    sku = `${baseSKU}-${counter}`.toUpperCase();
    counter++;
  }
}

/**
 * Generate a variant SKU based on parent SKU
 * @param parentSKU - The parent product SKU
 * @param variantName - The variant name
 * @param index - The variant index
 * @returns A variant SKU
 */
export function generateVariantSKU(
  parentSKU: string,
  variantName: string,
  index: number
): string {
  const variantPrefix = variantName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return `${parentSKU}-${variantPrefix}${index}`;
}
