import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import cloudinary, { CLOUDINARY_FOLDERS, UPLOAD_CONFIG } from '@/lib/cloudinary/config';

const MAX_REVIEW_IMAGES = 3;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please login to upload images' }, { status: 401 });
  }

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
        { error: `File too large. Maximum size: ${UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: CLOUDINARY_FOLDERS.REVIEWS,
            resource_type: 'image',
            transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
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
    console.error('Error uploading review image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
