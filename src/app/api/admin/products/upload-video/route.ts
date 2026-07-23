import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import cloudinary, { CLOUDINARY_FOLDERS } from '@/lib/cloudinary/config';

/**
 * POST /api/admin/products/upload-video
 * Upload a product video to Cloudinary
 * Admin only
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

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file format. Allowed: MP4, WebM, MOV, AVI' },
        { status: 400 }
      );
    }

    // Validate file size (50MB max for video)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum video size: 50MB' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const folder = `${CLOUDINARY_FOLDERS.PRODUCTS}/videos`;

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'video',
            eager: [
              { format: 'mp4', video_codec: 'h264' },
            ],
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
      video: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        duration: uploadResult.duration,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
      },
    });
  } catch (error: any) {
    console.error('Error uploading video:', error);
    return NextResponse.json(
      { error: 'Failed to upload video', details: error.message },
      { status: 500 }
    );
  }
}
