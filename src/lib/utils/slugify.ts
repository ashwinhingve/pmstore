import Product from '@/models/Product';
import connectDB from '@/lib/mongodb/connection';

/**
 * Convert a string to a URL-friendly slug
 * @param text - The text to convert to a slug
 * @returns The slugified text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, ''); // Remove trailing hyphens
}

/**
 * Generate a unique slug for a product
 * @param baseName - The base name to generate the slug from
 * @param excludeId - Optional product ID to exclude from uniqueness check (for updates)
 * @returns A unique slug
 */
export async function generateUniqueSlug(
  baseName: string,
  excludeId?: string
): Promise<string> {
  await connectDB();

  let slug = slugify(baseName);
  let counter = 1;

  while (true) {
    const query: any = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existing = await Product.findOne(query);

    if (!existing) {
      return slug;
    }

    // If slug exists, append counter
    slug = `${slugify(baseName)}-${counter}`;
    counter++;
  }
}
