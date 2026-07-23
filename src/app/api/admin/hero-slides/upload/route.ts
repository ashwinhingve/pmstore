import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import cloudinary, { CLOUDINARY_FOLDERS, UPLOAD_CONFIG } from '@/lib/cloudinary/config';

/**
 * POST /api/admin/hero-slides/upload
 * Upload a hero slide image to Cloudinary (admin only)
 */
export async function POST(req: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileType = file.type.split('/')[1];
    if (!UPLOAD_CONFIG.ALLOWED_FORMATS.includes(fileType)) {
      return NextResponse.json(
        { error: `Invalid format. Allowed: ${UPLOAD_CONFIG.ALLOWED_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max ${UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: CLOUDINARY_FOLDERS.HERO_SLIDES,
            resource_type: 'image',
            transformation: [{ width: 1920, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    const uploadResult = result as any;

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });
  } catch (error: any) {
    console.error('Hero slide upload error:', error);
    return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
  }
}
