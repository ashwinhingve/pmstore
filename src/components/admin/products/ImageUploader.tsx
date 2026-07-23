'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { X, Upload, MoveUp, MoveDown, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProductImageData } from '@/lib/validations/product';

interface ImageUploaderProps {
  images: ProductImageData[];
  onChange: (images: ProductImageData[]) => void;
  maxImages?: number;
}

export default function ImageUploader({
  images,
  onChange,
  maxImages = 4,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const replaceInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Upload helper ───────────────────────────────────────────
  async function uploadFile(file: File): Promise<ProductImageData | null> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/admin/products/upload-image', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload image');
    const data = await response.json();
    return data.image;
  }

  // ── Delete from Cloudinary ──────────────────────────────────
  async function deleteFromCloud(publicId: string) {
    try {
      await fetch(
        `/api/admin/products/delete-image?publicId=${encodeURIComponent(publicId)}`,
        { method: 'DELETE' }
      );
    } catch (err) {
      console.error('Error deleting image from Cloudinary:', err);
    }
  }

  // ── Drop handler (add new images) ──────────────────────────
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (images.length >= maxImages) {
        alert(`Maximum ${maxImages} images allowed`);
        return;
      }
      const remaining = maxImages - images.length;
      const filesToUpload = acceptedFiles.slice(0, remaining);

      setUploading(true);
      setUploadProgress(0);

      try {
        const uploaded: ProductImageData[] = [];
        for (let i = 0; i < filesToUpload.length; i++) {
          const img = await uploadFile(filesToUpload[i]);
          if (img) uploaded.push({ ...img, order: images.length + uploaded.length });
          setUploadProgress(((i + 1) / filesToUpload.length) * 100);
        }
        onChange([...images, ...uploaded]);
      } catch {
        alert('Failed to upload images. Please try again.');
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [images, maxImages, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024,
    disabled: uploading || images.length >= maxImages,
  });

  // ── Replace a single image ──────────────────────────────────
  async function handleReplace(index: number, file: File) {
    setReplacingIndex(index);
    try {
      const oldImage = images[index];
      const newImg = await uploadFile(file);
      if (!newImg) return;

      // Delete old from Cloudinary
      if (oldImage.publicId) await deleteFromCloud(oldImage.publicId);

      const updated = images.map((img, i) =>
        i === index ? { ...newImg, order: i } : img
      );
      onChange(updated);
    } catch {
      alert('Failed to replace image');
    } finally {
      setReplacingIndex(null);
    }
  }

  // ── Remove image ────────────────────────────────────────────
  async function removeImage(index: number) {
    const image = images[index];
    if (image.publicId) await deleteFromCloud(image.publicId);
    const reordered = images
      .filter((_, i) => i !== index)
      .map((img, i) => ({ ...img, order: i }));
    onChange(reordered);
  }

  // ── Reorder ─────────────────────────────────────────────────
  function moveImage(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;
    const newImages = [...images];
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    onChange(newImages.map((img, i) => ({ ...img, order: i })));
  }

  // ── Set as primary ──────────────────────────────────────────
  function setAsPrimary(index: number) {
    if (index === 0) return;
    const newImages = [...images];
    const [primary] = newImages.splice(index, 1);
    newImages.unshift(primary);
    onChange(newImages.map((img, i) => ({ ...img, order: i })));
  }

  return (
    <div className="space-y-4">
      {/* Upload Drop Zone */}
      {images.length < maxImages && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-amber-500 bg-amber-50'
              : 'border-gray-300 hover:border-amber-400 bg-gray-50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          {uploading ? (
            <div>
              <p className="text-gray-600 mb-2 font-medium">Uploading...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                <div
                  className="bg-gradient-to-r from-amber-600 to-red-700 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-gray-700 font-medium mb-1">
                {isDragActive ? 'Drop images here' : 'Drag & drop images or click to browse'}
              </p>
              <p className="text-sm text-gray-500">
                Up to {maxImages} images · 5MB each · JPEG, PNG, WebP
              </p>
            </div>
          )}
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.publicId || index}
              className="relative group aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200 hover:border-amber-300 transition-colors"
            >
              <Image
                src={image.url}
                alt={`Product image ${index + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />

              {/* Primary Badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-md">
                  <Star className="w-3 h-3 fill-white" />
                  Primary
                </div>
              )}

              {/* Replace loading overlay */}
              {replacingIndex === index && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                  <div className="text-center text-white">
                    <div className="w-7 h-7 mx-auto mb-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium">Replacing...</span>
                  </div>
                </div>
              )}

              {/* Hidden replace input per image */}
              <input
                ref={(el) => { replaceInputRefs.current[index] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleReplace(index, file);
                  e.target.value = '';
                }}
              />

              {/* Hover Actions Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {/* Top row: move */}
                <div className="flex items-center gap-1">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => moveImage(index, 'up')}
                      title="Move left"
                      className="w-8 h-8 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center shadow transition-colors"
                    >
                      <MoveUp className="w-4 h-4 text-gray-700" />
                    </button>
                  )}
                  {index < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveImage(index, 'down')}
                      title="Move right"
                      className="w-8 h-8 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center shadow transition-colors"
                    >
                      <MoveDown className="w-4 h-4 text-gray-700" />
                    </button>
                  )}
                </div>

                {/* Bottom row: replace, set primary, delete */}
                <div className="flex items-center gap-1">
                  {/* Replace */}
                  <button
                    type="button"
                    onClick={() => replaceInputRefs.current[index]?.click()}
                    title="Replace image"
                    disabled={replacingIndex !== null}
                    className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center shadow transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  {/* Set as primary */}
                  {index !== 0 && (
                    <button
                      type="button"
                      onClick={() => setAsPrimary(index)}
                      title="Set as primary"
                      className="w-8 h-8 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center shadow transition-colors"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    title="Delete image"
                    className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center shadow transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Order number */}
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-xs font-bold text-gray-700 shadow">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500">
        <span>{images.length}/{maxImages} images</span>
        {images.length > 0 && (
          <>
            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500" /> = Set as primary</span>
            <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 text-blue-500" /> = Replace image</span>
            <span className="flex items-center gap-1"><X className="w-3 h-3 text-red-500" /> = Delete image</span>
          </>
        )}
      </div>
    </div>
  );
}
