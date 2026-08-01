import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import { applyRateLimit } from '@/lib/middleware/rateLimit';
import { createErrorResponse, Errors } from '@/lib/utils/errorHandler';
import { customOrderSchema } from '@/lib/validations/custom-order';
import CustomOrder from '@/models/CustomOrder';
import { emailService } from '@/lib/notifications/email';
import cloudinary, {
  CLOUDINARY_FOLDERS,
  UPLOAD_CONFIG,
  signedImageUrl,
} from '@/lib/cloudinary/config';

export const runtime = 'nodejs';

// Custom order request: 5 per hour per IP (mail + a DB write + image uploads).
const CUSTOM_ORDER_RATE_LIMIT = {
  windowMs: 3_600_000,
  maxRequests: 5,
  keyPrefix: 'custom-order:request',
};

const MAX_IMAGES = 5;

/**
 * POST /api/custom-order
 * Public lead-capture: a customer requests a medicine we may not stock, and may
 * attach up to 5 photos (medicine pack, handwritten list, or a prescription).
 * Images may be health data → stored private (access_mode: 'authenticated') and
 * only ever surfaced through signedImageUrl(). Never logs PII or image URLs
 * (root CLAUDE.md rules #6). Accepts multipart/form-data.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await applyRateLimit(req, CUSTOM_ORDER_RATE_LIMIT);
    if (limited) return limited;

    await connectDB();

    const formData = await req.formData();

    // Text fields — coerce to the shapes customOrderSchema expects.
    const asStr = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');
    const parsed = customOrderSchema.safeParse({
      name: asStr(formData.get('name')),
      phone: asStr(formData.get('phone')),
      email: asStr(formData.get('email')),
      medicines: asStr(formData.get('medicines')),
      quantity: asStr(formData.get('quantity')),
      deliveryArea: asStr(formData.get('deliveryArea')),
      pincode: asStr(formData.get('pincode')),
      hasPrescription: formData.get('hasPrescription') === 'true',
      notes: asStr(formData.get('notes')),
      website: asStr(formData.get('website')),
    });
    if (!parsed.success) {
      throw Errors.validationError(
        'Check the highlighted fields and try again',
        parsed.error.flatten()
      );
    }

    const { website, ...data } = parsed.data;

    // Honeypot tripped: pretend success, do nothing.
    if (website) {
      return NextResponse.json({ data: { received: true } }, { status: 201 });
    }

    // Validate attached images (a user error here should be surfaced, since they
    // deliberately added the files) — before spending any Cloudinary quota.
    const files = formData.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > MAX_IMAGES) {
      throw Errors.validationError(`Attach no more than ${MAX_IMAGES} images.`);
    }
    for (const file of files) {
      const format = file.type.split('/')[1];
      if (!format || !UPLOAD_CONFIG.ALLOWED_FORMATS.includes(format)) {
        throw Errors.validationError(
          `Use a JPG, PNG or WebP image. Allowed: ${UPLOAD_CONFIG.ALLOWED_FORMATS.join(', ')}.`
        );
      }
      if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
        throw Errors.validationError(
          `Each image must be under ${UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB.`
        );
      }
    }

    // Normalise empty-string optionals to undefined before storing.
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])
    ) as typeof data;

    // Upload images best-effort. If Cloudinary is unconfigured or an upload
    // fails, we still save the text request rather than lose the lead — staff
    // can call the customer and ask for the photos again.
    let images: { url: string; publicId: string }[] = [];
    const cloudinaryReady =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;
    if (files.length && cloudinaryReady) {
      try {
        images = await Promise.all(
          files.map(async (file) => {
            const buffer = Buffer.from(await file.arrayBuffer());
            const result = await new Promise<{ secure_url: string; public_id: string }>(
              (resolve, reject) => {
                cloudinary.uploader
                  .upload_stream(
                    {
                      folder: CLOUDINARY_FOLDERS.CUSTOM_ORDERS,
                      resource_type: 'image',
                      // May contain a prescription → not publicly retrievable by URL.
                      access_mode: 'authenticated',
                    },
                    (error, res) =>
                      error || !res
                        ? reject(error || new Error('Image upload failed'))
                        : resolve(res as never)
                  )
                  .end(buffer);
              }
            );
            return { url: result.secure_url, publicId: result.public_id };
          })
        );
      } catch {
        // Log the message only — never the payload, which carries image URLs.
        console.error('Custom order: image upload failed (request stored without images).');
        images = [];
      }
    } else if (files.length && !cloudinaryReady) {
      console.error('Custom order: Cloudinary not configured (request stored without images).');
    }

    const doc = await CustomOrder.create({ ...cleaned, images });

    // Notify the shop with signed links to any photos. Never block the response
    // (or leak PII) on a mail failure — the request is already stored.
    try {
      await emailService.sendCustomOrder({
        ...cleaned,
        imageUrls: images.map((img) => signedImageUrl(img.publicId)),
      });
    } catch {
      console.error('Custom order email failed to send (request stored).');
    }

    return NextResponse.json(
      { data: { received: true, id: doc._id.toString() } },
      { status: 201 }
    );
  } catch (err) {
    return createErrorResponse(err);
  }
}
