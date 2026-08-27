import cloudinary, { CLOUDINARY_FOLDERS, IMAGE_TRANSFORMATIONS, UPLOAD_CONFIG } from './config';

export interface UploadedProductImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Upload one image buffer to Cloudinary with the standard product
 * transformation. Shared by the admin product-form uploader
 * (`/api/admin/products/upload-image`, which also serves the categories admin
 * page via a `folder` override) and the bulk-import "attach images by
 * filename" flow so both go through one place.
 */
export async function uploadProductImageBuffer(
  buffer: Buffer,
  folder: string = CLOUDINARY_FOLDERS.PRODUCTS
): Promise<UploadedProductImage> {
  const result = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [IMAGE_TRANSFORMATIONS.PRODUCT_MAIN],
        },
        (error, uploaded) => {
          if (error) reject(error);
          else resolve(uploaded);
        }
      )
      .end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

/** File extension (lowercase, no dot) — used to validate an uploaded batch image. */
export function isAllowedImageFormat(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return UPLOAD_CONFIG.ALLOWED_FORMATS.includes(ext);
}
