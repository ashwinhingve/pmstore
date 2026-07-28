/**
 * Direct, unsigned Cloudinary upload from the device.
 *
 * Prescription images go straight to Cloudinary (not through our API) so we
 * dodge serverless body-size limits and keep the image bytes off our server.
 * Requires an UNSIGNED upload preset configured in the Cloudinary dashboard,
 * exposed to the app via env:
 *   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME
 *   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET   (unsigned, restricted to the
 *                                           pmstore/prescriptions folder)
 * We only ever keep the returned secure_url — never log it (health data).
 */

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function isCloudinaryConfigured(): boolean {
  return !!CLOUD_NAME && !!UPLOAD_PRESET;
}

/** Uploads one local image URI and returns its secure Cloudinary URL. */
export async function uploadToCloudinary(uri: string): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Image upload is not configured. Set EXPO_PUBLIC_CLOUDINARY_* .');
  }

  const form = new FormData();
  // React Native FormData file part.
  form.append('file', { uri, type: 'image/jpeg', name: `rx-${uri.split('/').pop() || 'image'}.jpg` } as any);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', 'pmstore/prescriptions');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    throw new Error('Could not upload the image. Please try again.');
  }
  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error('Upload failed — no URL returned.');
  return data.secure_url;
}
