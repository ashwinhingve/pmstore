import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Folder structure for uploads
export const CLOUDINARY_FOLDERS = {
  PRODUCTS: 'pmstore/products',
  CATEGORIES: 'pmstore/categories',
  USERS: 'pmstore/users',
  HERO_SLIDES: 'pmstore/hero-slides',
  TEAM: 'pmstore/team',
  REVIEWS: 'pmstore/reviews',
  PRESCRIPTIONS: 'pmstore/prescriptions',
  CUSTOM_ORDERS: 'pmstore/custom-orders',
};

// Upload configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'],
  MAX_IMAGES_PER_PRODUCT: 4,
};

/**
 * Signed delivery URL for an access-restricted asset (prescriptions).
 *
 * Prescription images upload with `access_mode: 'authenticated'` — the plain
 * `/image/upload/<public_id>` URL returns 401 for anyone who doesn't have a
 * correctly signed request. This mints that signature server-side (using the
 * API secret, never exposed to the client) so only our own authenticated API
 * responses can produce a working link. Health data (root CLAUDE.md rule #6).
 *
 * Safe to call for pre-migration assets too: signing a request for an asset
 * that's still `access_mode: 'public'` works identically to an unsigned one,
 * so this can be adopted immediately without waiting on the migration script.
 */
export function signedImageUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type: 'image',
    type: 'upload',
    sign_url: true,
    secure: true,
  });
}

// Image transformation presets
export const IMAGE_TRANSFORMATIONS = {
  PRODUCT_MAIN: {
    width: 1200,
    height: 1200,
    crop: 'limit',
    quality: 'auto',
    fetch_format: 'auto',
  },
  PRODUCT_THUMBNAIL: {
    width: 300,
    height: 300,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
  },
  PRODUCT_CARD: {
    width: 600,
    height: 600,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
  },
};

export default cloudinary;
