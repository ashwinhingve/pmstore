import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Prescription from '@/models/Prescription';
import cloudinary, { CLOUDINARY_FOLDERS, UPLOAD_CONFIG, signedImageUrl } from '@/lib/cloudinary/config';
import { applyRateLimit, RateLimitPresets } from '@/lib/middleware/rateLimit';
import { prescriptionMetaSchema } from '@/lib/validations/prescription';

/**
 * POST /api/prescriptions
 * Upload 1–5 prescription images and create a pending prescription record.
 * Health data: image URLs are never logged (root CLAUDE.md rule #6).
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimited = await applyRateLimit(req, RateLimitPresets.PRESCRIPTION_UPLOAD);
    if (rateLimited) return rateLimited;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Sign in to upload a prescription.' },
        { status: 401 },
      );
    }

    await connectDB();

    const formData = await req.formData();
    const files = formData.getAll('images').filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: 'Add at least one prescription image.' }, { status: 400 });
    }
    if (files.length > 5) {
      return NextResponse.json({ error: 'Upload no more than 5 images.' }, { status: 400 });
    }

    // Validate every file before spending any Cloudinary quota.
    for (const file of files) {
      const format = file.type.split('/')[1];
      if (!format || !UPLOAD_CONFIG.ALLOWED_FORMATS.includes(format)) {
        return NextResponse.json(
          { error: `Use a JPG, PNG or WebP image. Allowed: ${UPLOAD_CONFIG.ALLOWED_FORMATS.join(', ')}.` },
          { status: 400 },
        );
      }
      if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Each image must be under ${UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB.` },
          { status: 400 },
        );
      }
    }

    const parsed = prescriptionMetaSchema.safeParse({
      patientName: formData.get('patientName') ?? undefined,
      doctorName: formData.get('doctorName') ?? undefined,
      issueDate: formData.get('issueDate') ?? undefined,
      buildCartRequested: formData.get('buildCartRequested') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Check the prescription details and try again.' },
        { status: 400 },
      );
    }
    const meta = parsed.data;

    // Image hosting must be configured before we accept an upload. Without it the
    // Cloudinary SDK throws an opaque error; fail early with an honest message.
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error('Prescription upload: Cloudinary is not configured.');
      return NextResponse.json(
        { error: 'Prescription upload is temporarily unavailable. Try again later or call the store.' },
        { status: 503 },
      );
    }

    const images = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await new Promise<{ secure_url: string; public_id: string }>(
          (resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                {
                  folder: CLOUDINARY_FOLDERS.PRESCRIPTIONS,
                  resource_type: 'image',
                  // Health data (root CLAUDE.md rule #6) — not publicly retrievable
                  // by URL. Display always goes through signedImageUrl().
                  access_mode: 'authenticated',
                },
                (error, res) =>
                  error || !res
                    ? reject(error || new Error('Image upload failed'))
                    : resolve(res as never),
              )
              .end(buffer);
          },
        );
        return { url: result.secure_url, publicId: result.public_id };
      }),
    );

    const prescription = await Prescription.create({
      userId: session.user.id,
      images,
      status: 'pending',
      patientName: meta.patientName,
      doctorName: meta.doctorName,
      issueDate: meta.issueDate,
      buildCartRequested: meta.buildCartRequested,
    });

    return NextResponse.json(
      {
        data: {
          id: prescription._id.toString(),
          status: prescription.status,
          imageCount: images.length,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    // Log the message only — never the payload, which carries image URLs.
    console.error('Prescription upload error:', (error as Error)?.message);
    return NextResponse.json({ error: 'Could not save the prescription. Try again.' }, { status: 500 });
  }
}

/**
 * GET /api/prescriptions
 * List the signed-in user's prescriptions, newest first.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Sign in to view your prescriptions.' }, { status: 401 });
    }

    await connectDB();

    const prescriptions = await Prescription.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const data = prescriptions.map((p) => ({
      id: String(p._id),
      status: p.status,
      images: p.images.map((img: { url: string; publicId: string }) => ({
        ...img,
        url: signedImageUrl(img.publicId),
      })),
      patientName: p.patientName ?? null,
      doctorName: p.doctorName ?? null,
      issueDate: p.issueDate ?? null,
      buildCartRequested: p.buildCartRequested ?? false,
      rejectionReason: p.rejectionReason ?? null,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({ data });
  } catch (error: unknown) {
    console.error('Prescription list error:', (error as Error)?.message);
    return NextResponse.json({ error: 'Could not load your prescriptions.' }, { status: 500 });
  }
}
