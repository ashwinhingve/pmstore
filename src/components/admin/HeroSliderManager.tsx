'use client';

import { useState, useRef } from 'react';
import { toast } from '@/store/useToastStore';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Upload,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  ImageIcon,
  Loader2,
} from 'lucide-react';

interface HeroSlide {
  _id?: string;
  image: string;
  imagePublicId: string;
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  ctaSecondaryText: string;
  ctaSecondaryLink: string;
  isActive: boolean;
  order: number;
}

const EMPTY_SLIDE: Omit<HeroSlide, '_id'> = {
  image: '',
  imagePublicId: '',
  title: '',
  subtitle: '',
  description: '',
  ctaText: 'Shop Now',
  ctaLink: '/products',
  ctaSecondaryText: '',
  ctaSecondaryLink: '/products',
  isActive: true,
  order: 0,
};

interface Props {
  initialSlides: HeroSlide[];
}

export default function HeroSliderManager({ initialSlides }: Props) {
  const [slides, setSlides] = useState<HeroSlide[]>(
    [...initialSlides].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<HeroSlide | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<Omit<HeroSlide, '_id'>>({ ...EMPTY_SLIDE });
  const [processing, setProcessing] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<'edit' | 'add' | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);
  const addFileRef = useRef<HTMLInputElement>(null);

  // ── Image upload ──────────────────────────────────────────────
  async function uploadImage(file: File): Promise<{ url: string; publicId: string } | null> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/hero-slides/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Couldn't upload the image. Try again.");
      return null;
    }
    return { url: data.url, publicId: data.publicId };
  }

  async function handleEditImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editForm) return;
    setUploadingFor('edit');
    const result = await uploadImage(file);
    setUploadingFor(null);
    if (result) {
      setEditForm({ ...editForm, image: result.url, imagePublicId: result.publicId });
    }
    e.target.value = '';
  }

  async function handleAddImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFor('add');
    const result = await uploadImage(file);
    setUploadingFor(null);
    if (result) {
      setAddForm({ ...addForm, image: result.url, imagePublicId: result.publicId });
    }
    e.target.value = '';
  }

  // ── Helper: call API and sync slides from response ────────────
  async function apiCall(
    url: string,
    method: string,
    body?: object
  ): Promise<HeroSlide[] | null> {
    setProcessing(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${method} failed`);
      return data.slides as HeroSlide[];
    } catch (err: any) {
      toast.error(err.message || "Couldn't save changes. Try again.");
      return null;
    } finally {
      setProcessing(false);
    }
  }

  // ── Add slide ─────────────────────────────────────────────────
  async function handleAdd() {
    if (!addForm.title.trim()) {
      toast.error('Enter a title before saving.');
      return;
    }
    const updated = await apiCall('/api/admin/hero-slider', 'POST', addForm);
    if (updated) {
      setSlides(updated);
      setAddForm({ ...EMPTY_SLIDE });
      setShowAdd(false);
    }
  }

  // ── Update slide ──────────────────────────────────────────────
  async function handleUpdate() {
    if (!editForm?._id) return;
    const { _id, ...fields } = editForm;
    const updated = await apiCall(`/api/admin/hero-slider/${_id}`, 'PATCH', fields);
    if (updated) {
      setSlides(updated);
      setEditingId(null);
      setEditForm(null);
    }
  }

  // ── Delete slide ──────────────────────────────────────────────
  async function handleDelete(slide: HeroSlide) {
    if (!slide._id) return;
    if (!confirm('Delete this slide?')) return;
    const updated = await apiCall(`/api/admin/hero-slider/${slide._id}`, 'DELETE');
    if (updated) setSlides(updated);
  }

  // ── Toggle active ─────────────────────────────────────────────
  async function toggleActive(slide: HeroSlide) {
    if (!slide._id) return;
    const updated = await apiCall(`/api/admin/hero-slider/${slide._id}`, 'PATCH', {
      isActive: !slide.isActive,
    });
    if (updated) setSlides(updated);
  }

  // ── Reorder ───────────────────────────────────────────────────
  async function moveSlide(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= slides.length) return;
    const reordered = [...slides];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    const withOrder = reordered.map((s, i) => ({ ...s, order: i }));
    // Optimistically update UI first
    setSlides(withOrder);
    const updated = await apiCall('/api/admin/hero-slider', 'PUT', { slides: withOrder });
    if (updated) setSlides(updated);
  }

  return (
    <div className="bg-[var(--paper-card)] rounded-xl border border-[var(--foil-soft)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink)]">Hero Slider</h2>
          <p className="text-sm text-[var(--ink-40)] mt-0.5">
            Manage homepage banner slides — images, text &amp; buttons
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-[var(--mint)] hover:bg-[var(--mint)] text-[var(--paper-card)]"
          disabled={showAdd || processing}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Slide
        </Button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <SlideForm
          form={addForm}
          onChange={(f) => setAddForm(f as Omit<HeroSlide, '_id'>)}
          onSave={handleAdd}
          onCancel={() => { setShowAdd(false); setAddForm({ ...EMPTY_SLIDE }); }}
          saving={processing}
          uploading={uploadingFor === 'add'}
          onImageClick={() => addFileRef.current?.click()}
          fileRef={addFileRef}
          onFileChange={handleAddImageUpload}
          title="New Slide"
        />
      )}

      {/* Slides List */}
      {slides.length === 0 && !showAdd ? (
        <div className="text-center py-16 border-2 border-dashed border-[var(--foil-soft)] rounded-xl">
          <ImageIcon className="w-12 h-12 text-[var(--ink-40)] mx-auto mb-3" />
          <p className="text-[var(--ink-40)] font-medium">No slides yet</p>
          <p className="text-sm text-[var(--ink-40)] mt-1">Click &quot;Add Slide&quot; to create your first banner</p>
        </div>
      ) : (
        <div className="space-y-4">
          {slides.map((slide, index) => (
            <div key={slide._id || index}>
              {editingId === slide._id && editForm ? (
                <SlideForm
                  form={editForm}
                  onChange={(f) => setEditForm(f as HeroSlide)}
                  onSave={handleUpdate}
                  onCancel={() => { setEditingId(null); setEditForm(null); }}
                  saving={processing}
                  uploading={uploadingFor === 'edit'}
                  onImageClick={() => editFileRef.current?.click()}
                  fileRef={editFileRef}
                  onFileChange={handleEditImageUpload}
                  title={`Edit Slide ${index + 1}`}
                />
              ) : (
                <SlideRow
                  slide={slide}
                  index={index}
                  total={slides.length}
                  onEdit={() => { setEditingId(slide._id ?? null); setEditForm({ ...slide }); }}
                  onDelete={() => handleDelete(slide)}
                  onToggle={() => toggleActive(slide)}
                  onMove={(dir) => moveSlide(index, dir)}
                  saving={processing}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Slide Row (view mode) ─────────────────────────────────────
function SlideRow({
  slide,
  index,
  total,
  onEdit,
  onDelete,
  onToggle,
  onMove,
  saving,
}: {
  slide: HeroSlide;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  saving: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${slide.isActive ? 'border-[var(--foil-soft)] bg-[var(--paper-card)] hover:border-[var(--mint)]' : 'border-[var(--foil-soft)] bg-[var(--foil-soft)] opacity-60'}`}>
      {/* Thumbnail */}
      <div className="relative w-24 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--foil-soft)]">
        {slide.image ? (
          <Image src={slide.image} alt={slide.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-[var(--ink-40)]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[var(--ink)] truncate">{slide.title || '(No title)'}</p>
        <p className="text-sm text-[var(--ink-70)] truncate">{slide.subtitle}</p>
        <p className="text-xs text-[var(--ink-40)] mt-0.5 truncate">{slide.ctaText} → {slide.ctaLink}</p>
      </div>

      {/* Slide number */}
      <span className="text-xs font-medium text-[var(--ink-40)] w-6 text-center flex-shrink-0">#{index + 1}</span>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Reorder */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0 || saving}
            className="p-1 rounded hover:bg-[var(--foil-soft)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move up"
          >
            <ChevronUp className="w-3.5 h-3.5 text-[var(--ink-40)]" />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1 || saving}
            className="p-1 rounded hover:bg-[var(--foil-soft)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move down"
          >
            <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-40)]" />
          </button>
        </div>

        {/* Toggle active */}
        <button
          onClick={onToggle}
          disabled={saving}
          className={`p-2 rounded-lg transition-colors ${slide.isActive ? 'text-[var(--mint)] hover:bg-[var(--mint-soft)]' : 'text-[var(--ink-40)] hover:bg-[var(--foil-soft)]'}`}
          title={slide.isActive ? 'Hide slide' : 'Show slide'}
        >
          {slide.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

        {/* Edit */}
        <button
          onClick={onEdit}
          disabled={saving}
          className="p-2 rounded-lg hover:bg-[var(--foil-soft)] text-[var(--ink-70)] transition-colors disabled:opacity-50"
          title="Edit slide"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          disabled={saving}
          className="p-2 rounded-lg hover:bg-[var(--foil-soft)] text-[var(--ink-70)] transition-colors disabled:opacity-50"
          title="Delete slide"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Slide Form (add/edit mode) ────────────────────────────────
function SlideForm({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  uploading,
  onImageClick,
  fileRef,
  onFileChange,
  title,
}: {
  form: Partial<HeroSlide>;
  onChange: (f: Partial<HeroSlide>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  uploading: boolean;
  onImageClick: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  title: string;
}) {
  const f = (key: keyof HeroSlide) => (form[key] as string) ?? '';

  return (
    <div className="border-2 border-[var(--foil-soft)] rounded-xl p-5 bg-[var(--foil-soft)]">
      <h3 className="font-semibold text-[var(--ink)] mb-4">{title}</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left: Image */}
        <div>
          <label className="block text-sm font-medium text-[var(--ink)] mb-2">Slide Image</label>
          <div
            onClick={onImageClick}
            className="relative w-full aspect-[16/7] rounded-lg overflow-hidden border-2 border-dashed border-[var(--foil-soft)] hover:border-[var(--mint)] cursor-pointer bg-white transition-colors group"
          >
            {form.image ? (
              <>
                <Image src={form.image} alt="Preview" fill className="object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-white text-center">
                    <Upload className="w-6 h-6 mx-auto mb-1" />
                    <span className="text-sm font-medium">Change Image</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[var(--ink-40)] group-hover:text-[var(--mint)] transition-colors">
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-[var(--ink-70)]" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">Click to upload image</span>
                    <span className="text-xs mt-1">JPG, PNG, WebP · Max 5MB</span>
                  </>
                )}
              </div>
            )}
            {uploading && form.image && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />

          {/* OR divider + URL input */}
          <div className="flex items-center gap-2 mt-3 mb-2">
            <div className="flex-1 h-px bg-[var(--foil-soft)]" />
            <span className="text-xs text-[var(--ink-40)] font-medium px-1">or paste URL</span>
            <div className="flex-1 h-px bg-[var(--foil-soft)]" />
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={f('image')}
              onChange={(e) => onChange({ ...form, image: e.target.value, imagePublicId: '' })}
              placeholder="https://example.com/image.jpg"
              className="text-xs flex-1"
            />
            {form.image && (
              <button
                type="button"
                onClick={() => onChange({ ...form, image: '', imagePublicId: '' })}
                className="p-1.5 rounded-md hover:bg-[var(--foil-soft)] text-[var(--ink-70)] hover:text-[var(--ink)] transition-colors flex-shrink-0"
                title="Clear image"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Text fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">Title *</label>
            <Input
              value={f('title')}
              onChange={(e) => onChange({ ...form, title: e.target.value })}
              placeholder="e.g., Welcome to PM Store"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">Subtitle / Badge text</label>
            <Input
              value={f('subtitle')}
              onChange={(e) => onChange({ ...form, subtitle: e.target.value })}
              placeholder="e.g., Premium Quality, Naturally Pure"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">Description</label>
            <textarea
              value={f('description')}
              onChange={(e) => onChange({ ...form, description: e.target.value })}
              placeholder="Short description displayed on the slide..."
              rows={3}
              className="w-full text-sm rounded-md border border-[var(--foil-soft)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--ink)] focus:border-transparent resize-none"
            />
          </div>
        </div>
      </div>

      {/* CTA Buttons row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div className="space-y-2 p-3 bg-white rounded-lg border border-[var(--foil-soft)]">
          <p className="text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wide">Primary Button</p>
          <Input
            value={f('ctaText')}
            onChange={(e) => onChange({ ...form, ctaText: e.target.value })}
            placeholder="Button label e.g. Shop Now"
          />
          <Input
            value={f('ctaLink')}
            onChange={(e) => onChange({ ...form, ctaLink: e.target.value })}
            placeholder="Link e.g. /products"
          />
        </div>
        <div className="space-y-2 p-3 bg-white rounded-lg border border-[var(--foil-soft)]">
          <p className="text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wide">Secondary Button (optional)</p>
          <Input
            value={f('ctaSecondaryText')}
            onChange={(e) => onChange({ ...form, ctaSecondaryText: e.target.value })}
            placeholder="Button label (leave blank to hide)"
          />
          <Input
            value={f('ctaSecondaryLink')}
            onChange={(e) => onChange({ ...form, ctaSecondaryLink: e.target.value })}
            placeholder="Link e.g. /products"
          />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-5">
        {/* Active toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.isActive !== false}
            onChange={(e) => onChange({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 accent-[var(--mint)]"
          />
          <span className="text-sm text-[var(--ink)]">Active (visible on homepage)</span>
        </label>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving || uploading}
            className="bg-[var(--ink)] hover:opacity-90 text-[var(--paper-card)]"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4 mr-1" /> Save Slide</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
