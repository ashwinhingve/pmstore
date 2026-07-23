import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import Product from '../src/models/Product';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

/**
 * Validation script to check all products have correct camelCase fields
 * and no orphan snake_case fields remain.
 *
 * Usage: npx ts-node scripts/validate-products.ts
 */

interface ValidationIssue {
  productName: string;
  productId: string;
  issue: string;
}

async function validateProducts() {
  const issues: ValidationIssue[] = [];

  try {
    console.log('Starting product validation...\n');

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Use raw collection to see actual document fields (bypasses Mongoose schema)
    const db = mongoose.connection.db!;
    const collection = db.collection('products');
    const products = await collection.find({}).toArray();

    console.log(`Found ${products.length} products to validate\n`);

    for (const product of products) {
      const id = product._id.toString();
      const name = product.name || 'UNNAMED';

      // Check for orphan snake_case fields
      const snakeCaseFields = [
        'is_active',
        'stock_quantity',
        'average_rating',
        'review_count',
        'short_description',
      ];

      for (const field of snakeCaseFields) {
        if (product[field] !== undefined) {
          issues.push({
            productName: name,
            productId: id,
            issue: `Has orphan snake_case field: ${field}`,
          });
        }
      }

      // Check "featured" (should be "isFeatured")
      if (product.featured !== undefined && product.isFeatured === undefined) {
        issues.push({
          productName: name,
          productId: id,
          issue: 'Has "featured" but missing "isFeatured"',
        });
      }

      // Check required camelCase fields exist
      const requiredFields = [
        'name',
        'slug',
        'sku',
        'description',
        'category',
        'price',
        'stock',
        'isActive',
      ];

      for (const field of requiredFields) {
        if (product[field] === undefined) {
          issues.push({
            productName: name,
            productId: id,
            issue: `Missing required field: ${field}`,
          });
        }
      }

      // Check images are IProductImage[] format (not string[])
      if (product.images && product.images.length > 0) {
        if (typeof product.images[0] === 'string') {
          issues.push({
            productName: name,
            productId: id,
            issue: 'Images are string[] instead of IProductImage[] objects',
          });
        } else if (!product.images[0].url) {
          issues.push({
            productName: name,
            productId: id,
            issue: 'Image object missing "url" field',
          });
        }
      } else {
        issues.push({
          productName: name,
          productId: id,
          issue: 'No images defined',
        });
      }

      // Check rating fields
      if (product.averageRating === undefined) {
        issues.push({
          productName: name,
          productId: id,
          issue: 'Missing averageRating field',
        });
      }

      if (product.totalReviews === undefined) {
        issues.push({
          productName: name,
          productId: id,
          issue: 'Missing totalReviews field',
        });
      }
    }

    // Print results
    console.log('=== Validation Results ===\n');

    if (issues.length === 0) {
      console.log('All products are valid! No issues found.');
    } else {
      console.log(`Found ${issues.length} issues:\n`);

      // Group by product
      const grouped: Record<string, ValidationIssue[]> = {};
      for (const issue of issues) {
        const key = `${issue.productName} (${issue.productId})`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(issue);
      }

      for (const [product, productIssues] of Object.entries(grouped)) {
        console.log(`  ${product}:`);
        for (const issue of productIssues) {
          console.log(`    - ${issue.issue}`);
        }
        console.log('');
      }
    }

    console.log(`\nTotal products: ${products.length}`);
    console.log(`Products with issues: ${new Set(issues.map((i) => i.productId)).size}`);
    console.log(`Total issues: ${issues.length}`);
  } catch (error: any) {
    console.error('Validation failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

validateProducts();
