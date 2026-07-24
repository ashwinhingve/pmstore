/**
 * Client-side image compression before upload. Prescription photos from phones
 * are large and Cloudinary's free tier is not generous, so we resize the longest
 * edge to ~1600px and re-encode as JPEG. Browser only (uses canvas).
 *
 * Fails safe: if anything goes wrong, or compression wouldn't shrink the file,
 * the original is returned — a slightly large upload beats a broken one.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.8;

export async function compressImage(file: File): Promise<File> {
  if (typeof document === 'undefined') return file; // not in a browser
  if (!file.type.startsWith('image/')) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    );
    if (!blob || blob.size >= file.size) return file; // no real gain — keep original

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    return file;
  }
}
