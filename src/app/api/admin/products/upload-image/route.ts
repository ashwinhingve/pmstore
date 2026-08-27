import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import { UPLOAD_CONFIG } from '@/lib/cloudinary/config';
import { uploadProductImageBuffer } from '@/lib/cloudinary/upload-product-image';

/**
 * POST /api/admin/products/upload-image
 * Upload a product image to Cloudinary
 * Admin only
 */
export async function POST(req: NextRequest) {
  // Verify admin access
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = file.type.split('/')[1];
    if (!UPLOAD_CONFIG.ALLOWED_FORMATS.includes(fileType)) {
      return NextResponse.json(
        {
          error: 'Invalid file format',
          details: `Allowed formats: ${UPLOAD_CONFIG.ALLOWED_FORMATS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: `Maximum file size: ${UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine upload folder (categories admin overrides this; default is products)
    const folder = (formData.get('folder') as string) || undefined;
    const uploaded = folder
      ? await uploadProductImageBuffer(buffer, folder)
      : await uploadProductImageBuffer(buffer);

    // Return image metadata
    return NextResponse.json({
      success: true,
      url: uploaded.url,
      image: {
        url: uploaded.url,
        publicId: uploaded.publicId,
        width: uploaded.width,
        height: uploaded.height,
        format: uploaded.format,
        order: 0, // Will be set by frontend when adding to product
      },
    });
  } catch (error: any) {
    console.error('❌ Error uploading image:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload image',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
