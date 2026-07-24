import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import Prescription from '@/models/Prescription';
import cloudinary, { CLOUDINARY_FOLDERS, UPLOAD_CONFIG } from '@/lib/cloudinary/config';
import { authenticateMobile } from '@/lib/mobile/bearer';
import { v1Ok, v1Error } from '@/lib/mobile/response';
import { applyRateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';
import { prescriptionMetaSchema } from '@/lib/validations/prescription';

export const runtime = 'nodejs';

/**
 * POST /api/v1/prescriptions — upload prescription images.
 * Bearer auth required. Returns prescription ID and image count.
 * Rate limited. Never logs image URLs (health data).
 */
export async function POST(req: NextRequest) {
  const rateLimited = await applyRateLimit(req, RateLimitPresets.PRESCRIPTION_UPLOAD);
  if (rateLimited) return rateLimited;

  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(req);
    if (authError) return authError;

    const userId = claims!.sub;

    const formData = await req.formData();
    const files = formData.getAll('images').filter((f): f is File => f instanceof File);

    if (!files.length) {
      return v1Error('Add at least one prescription image', 400, 'NO_IMAGES');
    }
    if (files.length > 5) {
      return v1Error('Upload no more than 5 images', 400, 'TOO_MANY_IMAGES');
    }

    // Validate every file before uploading
    for (const file of files) {
      const format = file.type.split('/')[1];
      if (!format || !UPLOAD_CONFIG.ALLOWED_FORMATS.includes(format)) {
        return v1Error(
          `Use JPG, PNG or WebP. Allowed: ${UPLOAD_CONFIG.ALLOWED_FORMATS.join(', ')}`,
          400,
          'INVALID_FORMAT'
        );
      }
      if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
        const maxMb = UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
        return v1Error(`Each image must be under ${maxMb}MB`, 400, 'FILE_TOO_LARGE');
      }
    }

    // Parse metadata
    const parsed = prescriptionMetaSchema.safeParse({
      patientName: formData.get('patientName') ?? undefined,
      doctorName: formData.get('doctorName') ?? undefined,
      issueDate: formData.get('issueDate') ?? undefined,
      buildCartRequested: formData.get('buildCartRequested') ?? undefined,
    });

    if (!parsed.success) {
      return v1Error('Invalid prescription details', 400, 'VALIDATION_ERROR');
    }

    const meta = parsed.data;

    // Upload images to Cloudinary
    const images = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await new Promise<{ secure_url: string; public_id: string }>(
          (resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                { folder: CLOUDINARY_FOLDERS.PRESCRIPTIONS, resource_type: 'image' },
                (error, res) => (error || !res ? reject(error) : resolve(res as never)),
              )
              .end(buffer);
          },
        );
        return { url: result.secure_url, publicId: result.public_id };
      }),
    );

    // Create prescription record
    const prescription = await Prescription.create({
      userId,
      images,
      status: 'pending',
      patientName: meta.patientName,
      doctorName: meta.doctorName,
      issueDate: meta.issueDate,
      buildCartRequested: meta.buildCartRequested,
    });

    return v1Ok(
      {
        prescriptionId: String(prescription._id),
        status: prescription.status,
        imageCount: images.length,
      },
      201
    );
  } catch (err) {
    // Never log image URLs (health data — CLAUDE.md rule #6)
    console.error('v1 prescription upload error:', (err as Error)?.message);
    return v1Error('Could not upload prescription', 500, 'UPLOAD_ERROR');
  }
}

/**
 * GET /api/v1/prescriptions — list user's prescriptions.
 * Bearer auth required. Newest first.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { claims, error: authError } = authenticateMobile(req);
    if (authError) return authError;

    const userId = claims!.sub;

    const prescriptions = await Prescription.find({ userId })
      .sort({ createdAt: -1 })
      .lean<Array<{
        _id: unknown;
        status?: unknown;
        images?: unknown;
        patientName?: unknown;
        doctorName?: unknown;
        issueDate?: unknown;
        buildCartRequested?: unknown;
        rejectionReason?: unknown;
        createdAt?: unknown;
      }>>();

    const data = prescriptions.map((p) => ({
      _id: String(p._id),
      status: String(p.status ?? 'pending'),
      images: p.images,
      patientName: p.patientName ?? null,
      doctorName: p.doctorName ?? null,
      issueDate: p.issueDate ?? null,
      buildCartRequested: Boolean(p.buildCartRequested),
      rejectionReason: p.rejectionReason ?? null,
      createdAt: p.createdAt,
    }));

    return v1Ok({ prescriptions: data });
  } catch (err) {
    console.error('v1 prescriptions list error:', (err as Error)?.message);
    return v1Error('Could not fetch prescriptions', 500, 'INTERNAL_ERROR');
  }
}
