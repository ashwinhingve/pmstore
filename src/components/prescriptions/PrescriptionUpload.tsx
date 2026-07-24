'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { Upload, X, Check, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/utils/compress-image';

const MAX_IMAGES = 5;

interface LocalImage {
  file: File;
  preview: string;
}

interface PrescriptionUploadProps {
  /** Called with the new prescription id once the upload succeeds. */
  onUploaded?: (prescriptionId: string) => void;
  className?: string;
}

export function PrescriptionUpload({ onUploaded, className }: PrescriptionUploadProps) {
  const [images, setImages] = useState<LocalImage[]>([]);
  const [patientName, setPatientName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Release object URLs when the component unmounts.
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      setError(null);
      const room = MAX_IMAGES - images.length;
      if (room <= 0) {
        setError(`You can attach up to ${MAX_IMAGES} images.`);
        return;
      }
      const next = await Promise.all(
        accepted.slice(0, room).map(async (file) => {
          const compressed = await compressImage(file);
          return { file: compressed, preview: URL.createObjectURL(compressed) };
        }),
      );
      setImages((prev) => [...prev, ...next]);
    },
    [images.length],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxFiles: MAX_IMAGES,
    disabled: uploading || images.length >= MAX_IMAGES,
  });

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (images.length === 0) {
      setError('Add at least one prescription image.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      images.forEach((img) => form.append('images', img.file));
      if (patientName.trim()) form.append('patientName', patientName.trim());
      if (doctorName.trim()) form.append('doctorName', doctorName.trim());
      if (issueDate) form.append('issueDate', issueDate);

      const res = await fetch('/api/prescriptions', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not upload the prescription.');

      setSavedId(data.data.id);
      onUploaded?.(data.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload the prescription.');
    } finally {
      setUploading(false);
    }
  };

  if (savedId) {
    return (
      <div
        className={className}
        role="status"
      >
        <div className="flex items-center gap-2 rounded-[var(--radius-card)] bg-[var(--mint-soft,#e7f5ef)] px-4 py-3 text-[var(--ink)]">
          <Check className="h-5 w-5 text-[var(--mint,#137a54)]" aria-hidden="true" />
          <p>Prescription received. Our pharmacist will review it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-[var(--line,#d9d9d9)] px-6 py-8 text-center transition-colors hover:border-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ink)]"
        aria-label="Add prescription images"
      >
        <input {...getInputProps()} />
        <Upload className="h-6 w-6 text-[var(--ink-soft,#666)]" aria-hidden="true" />
        <p className="text-[var(--ink)]">
          {isDragActive ? 'Drop the images here' : 'Tap to add a photo, or drag images here'}
        </p>
        <p className="text-sm text-[var(--ink-soft,#666)]">
          JPG, PNG or WebP · up to {MAX_IMAGES} images · {images.length} added
        </p>
      </div>

      {images.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <li
              key={img.preview}
              className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] border border-[var(--line,#d9d9d9)]"
            >
              <Image
                src={img.preview}
                alt={`Prescription image ${i + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, 25vw"
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                disabled={uploading}
                aria-label={`Remove image ${i + 1}`}
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)]/80 text-white hover:bg-[var(--ink)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-[var(--ink)]">
          Patient name (optional)
          <input
            type="text"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="rounded-[var(--radius-input,0.5rem)] border border-[var(--line,#d9d9d9)] px-3 py-2 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--ink)]">
          Prescribing doctor (optional)
          <input
            type="text"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            className="rounded-[var(--radius-input,0.5rem)] border border-[var(--line,#d9d9d9)] px-3 py-2 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--ink)]">
          Date on prescription (optional)
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="data rounded-[var(--radius-input,0.5rem)] border border-[var(--line,#d9d9d9)] px-3 py-2 text-base"
          />
        </label>
      </div>

      {error && (
        <p className="mt-3 text-sm text-[var(--rx)]" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading || images.length === 0}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--ink)] px-6 py-2.5 font-semibold text-white disabled:opacity-50"
      >
        {uploading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {uploading ? 'Uploading…' : 'Upload prescription'}
      </button>
    </div>
  );
}

export default PrescriptionUpload;
