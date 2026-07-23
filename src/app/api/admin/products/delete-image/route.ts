import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth-helpers';
import cloudinary from '@/lib/cloudinary/config';

/**
 * DELETE /api/admin/products/delete-image
 * Delete a product image from Cloudinary
 * Admin only
 */
export async function DELETE(req: NextRequest) {
  // Verify admin access
  const adminCheck = await verifyAdminAccess();
  if (adminCheck.error) return adminCheck.error;

  try {
    const { searchParams } = new URL(req.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return NextResponse.json(
        { error: 'Public ID is required' },
        { status: 400 }
      );
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully',
      });
    } else {
      return NextResponse.json(
        {
          error: 'Failed to delete image',
          details: result,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error deleting image:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete image',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
