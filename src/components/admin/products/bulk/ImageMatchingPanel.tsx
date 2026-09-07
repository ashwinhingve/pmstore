'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageMatchingPanelProps {
  onImagesMatched: (images: Record<string, { url: string; publicId: string }>) => void;
  skus: string[];
}

async function uploadImageToCloudinary(file: File): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/admin/products/upload-image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  const data = await response.json();
  return {
    url: data.image.url,
    publicId: data.image.publicId,
  };
}

export function ImageMatchingPanel({
  onImagesMatched,
  skus,
}: ImageMatchingPanelProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedImages, setUploadedImages] = useState<
    Record<string, { url: string; publicId: string }>
  >({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter((f) =>
      f.type.startsWith('image/')
    );
    setFiles((prev) => [...prev, ...imageFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 5 * 1024 * 1024,
    disabled: uploading,
  });

  const getSkuFromFilename = (filename: string): string => {
    // Extract SKU from filename: "PMS-TAB-DOLO-650.jpg" -> "PMS-TAB-DOLO-650"
    return filename.replace(/\.[^.]+$/, '').trim().toUpperCase();
  };

  const matchedFiles = files.filter((f) => {
    const sku = getSkuFromFilename(f.name);
    return skus.some((s) => s.toUpperCase() === sku);
  });

  const unmatchedFiles = files.filter((f) => {
    const sku = getSkuFromFilename(f.name);
    return !skus.some((s) => s.toUpperCase() === sku);
  });

  const handleUploadAll = async () => {
    setUploading(true);
    try {
      const results: Record<string, { url: string; publicId: string }> = {};

      for (let i = 0; i < matchedFiles.length; i++) {
        const file = matchedFiles[i];
        const sku = getSkuFromFilename(file.name);

        try {
          const uploaded = await uploadImageToCloudinary(file);
          results[sku] = uploaded;
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: ((i + 1) / matchedFiles.length) * 100,
          }));
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }

      setUploadedImages(results);
      onImagesMatched(results);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper)] p-4">
      <h3 className="mb-3 font-medium text-[var(--ink)]">Product images</h3>
      <p className="mb-4 text-xs text-[var(--ink-70)]">
        Name files after SKUs (e.g., <code style={{ fontFamily: 'var(--font-data)' }}>PMS-TAB-DOLO-650.jpg</code>).
        Only matched files will be uploaded. Add images to rows in the grid.
      </p>

      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-sm)] border-2 border-dashed p-6 text-center transition-colors ${
          isDragActive
            ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
            : 'border-[var(--foil)] hover:bg-[var(--foil-soft)]'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mb-2 h-8 w-8 text-[var(--ink-40)]" aria-hidden="true" />
        <p className="font-medium text-[var(--ink)]">
          {isDragActive ? 'Drop images here' : 'Drag product images here'}
        </p>
        <p className="mt-1 text-xs text-[var(--ink-70)]">
          or click to choose · up to 5MB each, JPEG/PNG/WebP
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium text-[var(--ink)]">
            Files: {matchedFiles.length} matched,{' '}
            {unmatchedFiles.length > 0 && (
              <span className="text-[var(--ink-40)]">
                {unmatchedFiles.length} unmatched
              </span>
            )}
          </div>

          {matchedFiles.length > 0 && (
            <div className="mb-3">
              <div className="mb-2 text-xs font-medium text-[var(--brand)]">
                Matched ({matchedFiles.length})
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {matchedFiles.map((file, idx) => {
                  const sku = getSkuFromFilename(file.name);
                  const progress = uploadProgress[file.name] || 0;
                  return (
                    <div key={idx} className="rounded-sm border border-[var(--foil-soft)] p-2">
                      <div className="relative mb-2 h-20 w-full overflow-hidden rounded-sm bg-[var(--foil-soft)]">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                        {progress > 0 && progress < 100 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="text-xs font-medium text-white">
                              {Math.round(progress)}%
                            </div>
                          </div>
                        )}
                      </div>
                      <div
                        className="truncate text-xs text-[var(--ink-70)]"
                        style={{ fontFamily: 'var(--font-data)' }}
                        title={sku}
                      >
                        {sku}
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="mt-1 h-6 w-6 text-[var(--ink-40)] hover:text-[var(--ink)]"
                        type="button"
                        disabled={uploading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {unmatchedFiles.length > 0 && (
            <div className="mb-3">
              <div className="mb-2 text-xs font-medium text-[var(--ink-40)]">
                Unmatched ({unmatchedFiles.length})
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {unmatchedFiles.map((file, idx) => (
                  <div key={idx} className="rounded-sm border border-[var(--ink-40)] p-2 opacity-50">
                    <div className="relative mb-2 h-20 w-full overflow-hidden rounded-sm bg-[var(--foil-soft)]">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div
                      className="truncate text-xs text-[var(--ink-70)]"
                      style={{ fontFamily: 'var(--font-data)' }}
                      title={file.name}
                    >
                      {file.name}
                    </div>
                    <button
                      onClick={() => removeFile(files.indexOf(file))}
                      className="mt-1 h-6 w-6 text-[var(--ink-40)] hover:text-[var(--ink)]"
                      type="button"
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchedFiles.length > 0 && (
            <Button
              onClick={handleUploadAll}
              disabled={uploading || matchedFiles.length === 0}
              className="gap-2"
              size="sm"
            >
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              Upload {matchedFiles.length} image
              {matchedFiles.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
