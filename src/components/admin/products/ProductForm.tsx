'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ImageUploader from './ImageUploader';
import RichTextEditor from './RichTextEditor';
import SpecificationsManager from './SpecificationsManager';
import VariantsManager from './VariantsManager';
import { Upload, X, Video, RefreshCw, Link as LinkIcon } from 'lucide-react';
import type { ProductFormData } from '@/lib/validations/product';

// Client-safe slugify function (no database dependencies)
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Client-safe SKU generator (no database dependencies)
function generateSKU(category: string, productName: string): string {
  const categoryPrefix = category.substring(0, 3).toUpperCase();
  const namePrefix = productName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 3)
    .toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase().substring(7);
  return `TAPTI-${categoryPrefix}-${namePrefix}-${timestamp}`;
}

function getYouTubeEmbedUrl(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

interface ProductFormProps {
  mode: 'create' | 'edit';
  initialData?: Partial<ProductFormData> & { _id?: string };
}

const TABS = [
  { id: 'basic', label: 'Basic Info' },
  { id: 'images', label: 'Images & Video' },
  { id: 'pricing', label: 'Pricing & Inventory' },
  { id: 'variants', label: 'Variants' },
  { id: 'specifications', label: 'Specifications' },
  { id: 'seo', label: 'SEO' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function ProductForm({ mode, initialData }: ProductFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [showReplaceVideo, setShowReplaceVideo] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const replaceVideoInputRef = useRef<HTMLInputElement>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(res => res.json())
      .then(data => {
        if (data.categories?.length > 0) {
          setCategoryOptions(data.categories.map((c: any) => c.name));
        }
      })
      .catch(() => {});
  }, []);

  const [formData, setFormData] = useState<Partial<ProductFormData>>({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    sku: initialData?.sku || '',
    description: initialData?.description || '',
    longDescription: initialData?.longDescription || '',
    category: initialData?.category || '',
    subcategory: initialData?.subcategory || '',
    price: initialData?.price || 0,
    originalPrice: initialData?.originalPrice,
    stock: initialData?.stock || 0,
    images: initialData?.images || [],
    weight: initialData?.weight || 500,
    weightUnit: initialData?.weightUnit || 'g',
    tags: initialData?.tags || [],
    gstRate: initialData?.gstRate ?? 5,
    isActive: initialData?.isActive !== false,
    isFeatured: initialData?.isFeatured || false,
    isBestseller: initialData?.isBestseller || false,
    isTrending: initialData?.isTrending || false,
    isValueBuy: initialData?.isValueBuy || false,
    specifications: initialData?.specifications || [],
    variants: initialData?.variants || [],
    hasVariants: initialData?.hasVariants || false,
    seo: initialData?.seo || { keywords: [] },
    videoUrl: initialData?.videoUrl || '',
  });

  const updateField = <K extends keyof ProductFormData>(
    field: K,
    value: ProductFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-generate slug from name
    if (field === 'name' && mode === 'create') {
      setFormData((prev) => ({
        ...prev,
        slug: slugify(value as string),
      }));
    }

    // Auto-generate SKU if name or category changes
    if ((field === 'name' || field === 'category') && mode === 'create') {
      const name = field === 'name' ? (value as string) : formData.name || '';
      const category = field === 'category' ? (value as string) : formData.category || '';
      if (name && category) {
        setFormData((prev) => ({
          ...prev,
          sku: generateSKU(category, name),
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const url =
        mode === 'create'
          ? '/api/admin/products'
          : `/api/admin/products/${initialData?._id}`;

      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show detailed validation errors if available
        if (data.details && Array.isArray(data.details)) {
          const errorMessages = data.details.map((d: any) => `${d.path?.join('.')}: ${d.message}`).join(', ');
          throw new Error(`Validation failed: ${errorMessages}`);
        }
        throw new Error(data.error || data.details || 'Failed to save product');
      }

      router.push('/admin/products');
      router.refresh();
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message || 'Failed to save product. Please try again.');
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., Organic Chia Seeds"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug *
                </label>
                <Input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => updateField('slug', slugify(e.target.value))}
                  placeholder="organic-chia-seeds"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  URL: /products/{formData.slug || 'product-slug'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU *
                </label>
                <Input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => updateField('sku', e.target.value.toUpperCase())}
                  placeholder="TAPTI-ORG-CHI-ABC123"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                {categoryOptions.length > 0 ? (
                  <select
                    value={formData.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    required
                  >
                    <option value="">Select a category</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="text"
                    value={formData.category}
                    onChange={(e) => updateField('category', e.target.value)}
                    placeholder="e.g., Seeds"
                    required
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subcategory
              </label>
              <Input
                type="text"
                value={formData.subcategory || ''}
                onChange={(e) => updateField('subcategory', e.target.value)}
                placeholder="e.g., Organic Seeds"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Short Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Brief description (1-2 sentences)..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                maxLength={200}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.description?.length || 0}/200 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Long Description
              </label>
              <RichTextEditor
                content={formData.longDescription || ''}
                onChange={(content) => updateField('longDescription', content)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <Input
                type="text"
                value={formData.tags?.join(', ') || ''}
                onChange={(e) =>
                  updateField(
                    'tags',
                    e.target.value.split(',').map((t) => t.trim()).filter(Boolean)
                  )
                }
                placeholder="organic, healthy, superfood"
              />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => updateField('isActive', e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-700">Active (visible in shop)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => updateField('isFeatured', e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-700">Featured product</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isBestseller}
                  onChange={(e) => updateField('isBestseller', e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-700">Bestseller</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isTrending}
                  onChange={(e) => updateField('isTrending', e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-700">Trending</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isValueBuy}
                  onChange={(e) => updateField('isValueBuy', e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-gray-700">Value Buy</span>
              </label>
            </div>
          </div>
        );

      case 'images':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-4">
                Product Images (up to 4)
              </h3>
              <ImageUploader
                images={formData.images || []}
                onChange={(images) => updateField('images', images)}
                maxImages={4}
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-base font-semibold text-gray-800 mb-2">
                Product Video (optional)
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload a video file or paste a YouTube URL
              </p>

              {/* ── No video: show upload options ── */}
              {!formData.videoUrl && !showReplaceVideo && (
                <div className="space-y-4">
                  <div
                    onClick={() => !videoUploading && videoInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      videoUploading
                        ? 'border-amber-400 bg-amber-50 cursor-wait'
                        : 'border-gray-300 hover:border-amber-400 bg-gray-50'
                    }`}
                  >
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 50 * 1024 * 1024) { alert('Video must be under 50MB'); return; }
                        setVideoUploading(true);
                        try {
                          const fd = new FormData();
                          fd.append('file', file);
                          const res = await fetch('/api/admin/products/upload-video', { method: 'POST', body: fd });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error);
                          updateField('videoUrl', data.video.url);
                        } catch (err: any) {
                          alert(err.message || 'Failed to upload video');
                        } finally {
                          setVideoUploading(false);
                          if (videoInputRef.current) videoInputRef.current.value = '';
                        }
                      }}
                    />
                    {videoUploading ? (
                      <div>
                        <div className="w-8 h-8 mx-auto mb-2 border-[3px] border-amber-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-amber-700 font-medium">Uploading video...</p>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-700 font-medium">Click to upload video</p>
                        <p className="text-xs text-gray-500 mt-1">MP4, WebM, MOV (max 50MB)</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 border-t border-gray-200" />
                    <span className="text-xs text-gray-400 font-medium">OR</span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>

                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <Input
                      type="url"
                      value=""
                      onChange={(e) => { if (e.target.value) updateField('videoUrl', e.target.value); }}
                      placeholder="Paste YouTube URL: https://youtube.com/watch?v=..."
                    />
                  </div>
                </div>
              )}

              {/* ── Video exists: preview + actions ── */}
              {formData.videoUrl && !showReplaceVideo && (
                <div className="space-y-4">
                  {/* Preview */}
                  <div className="relative w-full max-w-md">
                    {formData.videoUrl.includes('youtube.com') || formData.videoUrl.includes('youtu.be') ? (
                      <div className="aspect-video rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                        <iframe
                          src={getYouTubeEmbedUrl(formData.videoUrl)}
                          className="w-full h-full"
                          allowFullScreen
                          title="Product video"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-xl overflow-hidden border border-gray-200 bg-black shadow-sm">
                        <video src={formData.videoUrl} controls className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 text-[10px] font-semibold bg-black/70 text-white rounded-md">
                        {formData.videoUrl.includes('youtube') || formData.videoUrl.includes('youtu.be') ? 'YouTube' : 'Uploaded'}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowReplaceVideo(true)}
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 font-medium transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Replace Video
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField('videoUrl', '')}
                      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Remove Video
                    </button>
                  </div>
                </div>
              )}

              {/* ── Replace mode ── */}
              {showReplaceVideo && (
                <div className="space-y-4 border-2 border-blue-200 rounded-xl p-4 bg-blue-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-blue-800">Upload replacement video</p>
                    <button
                      type="button"
                      onClick={() => setShowReplaceVideo(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div
                    onClick={() => !videoUploading && replaceVideoInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      videoUploading ? 'border-blue-400 bg-blue-50 cursor-wait' : 'border-blue-300 hover:border-blue-500 bg-white'
                    }`}
                  >
                    <input
                      ref={replaceVideoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 50 * 1024 * 1024) { alert('Video must be under 50MB'); return; }
                        setVideoUploading(true);
                        try {
                          const fd = new FormData();
                          fd.append('file', file);
                          const res = await fetch('/api/admin/products/upload-video', { method: 'POST', body: fd });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error);
                          updateField('videoUrl', data.video.url);
                          setShowReplaceVideo(false);
                        } catch (err: any) {
                          alert(err.message || 'Failed to upload video');
                        } finally {
                          setVideoUploading(false);
                          if (replaceVideoInputRef.current) replaceVideoInputRef.current.value = '';
                        }
                      }}
                    />
                    {videoUploading ? (
                      <div>
                        <div className="w-8 h-8 mx-auto mb-2 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-blue-700 font-medium">Uploading replacement...</p>
                      </div>
                    ) : (
                      <div>
                        <RefreshCw className="w-10 h-10 mx-auto mb-2 text-blue-400" />
                        <p className="text-sm text-blue-700 font-medium">Click to upload new video</p>
                        <p className="text-xs text-gray-500 mt-1">Replaces the current video · MP4, WebM, MOV (max 50MB)</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 border-t border-blue-200" />
                    <span className="text-xs text-gray-400 font-medium">OR paste URL</span>
                    <div className="flex-1 border-t border-blue-200" />
                  </div>

                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <Input
                      type="url"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          updateField('videoUrl', e.target.value);
                          setShowReplaceVideo(false);
                        }
                      }}
                      placeholder="New YouTube URL: https://youtube.com/watch?v=..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (₹) * <span className="text-gray-400 font-normal">(GST-inclusive/MRP)</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Original Price (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.originalPrice || ''}
                  onChange={(e) =>
                    updateField('originalPrice', parseFloat(e.target.value) || undefined)
                  }
                />
                <p className="mt-1 text-xs text-gray-500">For showing discounts</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Rate *
                </label>
                <select
                  value={formData.gstRate ?? 5}
                  onChange={(e) => updateField('gstRate', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value={0}>0% — GST Exempt</option>
                  <option value={5}>5% — Standard Food</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Intra-state (MP): CGST+SGST &nbsp;|&nbsp; Inter-state: IGST
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Quantity *
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => updateField('stock', parseInt(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.weight}
                  onChange={(e) => updateField('weight', parseFloat(e.target.value) || 500)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight Unit
                </label>
                <select
                  value={formData.weightUnit}
                  onChange={(e) => updateField('weightUnit', e.target.value as 'g' | 'kg' | 'L' | 'ml')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="ml">Millilitres (ml)</option>
                  <option value="L">Litres (L)</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'variants':
        return (
          <div className="space-y-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasVariants}
                onChange={(e) => updateField('hasVariants', e.target.checked)}
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-gray-700">
                This product has variants (different sizes, weights, etc.)
              </span>
            </label>

            {formData.hasVariants && (
              <VariantsManager
                variants={formData.variants || []}
                onChange={(variants) => updateField('variants', variants)}
                parentSKU={formData.sku}
              />
            )}
          </div>
        );

      case 'specifications':
        return (
          <SpecificationsManager
            specifications={formData.specifications || []}
            onChange={(specs) => updateField('specifications', specs)}
          />
        );

      case 'seo':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Title
              </label>
              <Input
                type="text"
                value={formData.seo?.metaTitle || ''}
                onChange={(e) =>
                  updateField('seo', { keywords: [], ...formData.seo, metaTitle: e.target.value })
                }
                placeholder={formData.name || 'Product name'}
                maxLength={60}
              />
              <p className="mt-1 text-xs text-gray-500">
                {(formData.seo?.metaTitle?.length || 0)}/60 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Description
              </label>
              <textarea
                value={formData.seo?.metaDescription || ''}
                onChange={(e) =>
                  updateField('seo', { keywords: [], ...formData.seo, metaDescription: e.target.value })
                }
                placeholder={formData.description || 'Product description'}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
                maxLength={160}
              />
              <p className="mt-1 text-xs text-gray-500">
                {(formData.seo?.metaDescription?.length || 0)}/160 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keywords (comma-separated)
              </label>
              <Input
                type="text"
                value={formData.seo?.keywords?.join(', ') || ''}
                onChange={(e) =>
                  updateField('seo', {
                    ...formData.seo,
                    keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean),
                  })
                }
                placeholder="organic, healthy, chia seeds"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OG Image URL
                <span className="ml-1 text-xs font-normal text-gray-400">
                  (optional — used for social sharing previews, 1200×630px recommended)
                </span>
              </label>
              <Input
                type="url"
                value={formData.seo?.ogImage || ''}
                onChange={(e) =>
                  updateField('seo', {
                    ...formData.seo,
                    keywords: formData.seo?.keywords || [],
                    ogImage: e.target.value || undefined,
                  })
                }
                placeholder="https://res.cloudinary.com/..."
              />
              {formData.seo?.ogImage && (
                <img
                  src={formData.seo.ogImage}
                  alt="OG image preview"
                  className="mt-2 h-20 rounded border border-gray-200 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>

            {/* Google Search Preview */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Google Search Preview
                </span>
                <span className="text-[10px] text-gray-400">Approximate — actual appearance varies</span>
              </div>
              <div className="p-4 bg-white">
                {/* URL breadcrumb */}
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600 leading-none font-medium">taptifs.in</p>
                    <p className="text-[11px] text-gray-400 leading-none mt-0.5">
                      taptifs.in &rsaquo; products &rsaquo; {formData.slug || 'product-slug'}
                    </p>
                  </div>
                </div>
                {/* Title */}
                {(() => {
                  const titleText = formData.seo?.metaTitle || formData.name || 'Product Title';
                  const tooLong = titleText.length > 60;
                  return (
                    <p
                      className={`text-lg font-normal leading-snug mb-0.5 ${tooLong ? 'text-orange-600' : ''}`}
                      style={{ color: tooLong ? undefined : '#1a0dab', fontFamily: 'arial, sans-serif' }}
                    >
                      {titleText}
                      {tooLong && (
                        <span className="ml-2 text-xs text-orange-500 font-medium">
                          ({titleText.length}/60 — too long)
                        </span>
                      )}
                    </p>
                  );
                })()}
                {/* Description */}
                {(() => {
                  const raw = formData.seo?.metaDescription || formData.description || 'Product description will appear here. Keep it between 120–160 characters for best results.';
                  const tooLong = raw.length > 160;
                  const display = tooLong ? raw.substring(0, 157) + '…' : raw;
                  return (
                    <p
                      className={`text-sm leading-snug ${tooLong ? 'text-orange-600' : 'text-gray-600'}`}
                      style={{ fontFamily: 'arial, sans-serif' }}
                    >
                      {display}
                      {tooLong && (
                        <span className="ml-1 text-xs text-orange-500 font-medium">
                          ({raw.length}/160 — too long)
                        </span>
                      )}
                    </p>
                  );
                })()}
              </div>
            </div>

          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl">
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-600 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        {renderTabContent()}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>

        <div className="flex gap-3">
          {mode === 'create' && (
            <Button
              type="submit"
              variant="outline"
              onClick={() => updateField('isActive', false)}
              disabled={submitting}
            >
              Save as Draft
            </Button>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-700 hover:to-red-800"
          >
            {submitting
              ? mode === 'create'
                ? 'Creating...'
                : 'Updating...'
              : mode === 'create'
              ? 'Create Product'
              : 'Update Product'}
          </Button>
        </div>
      </div>
    </form>
  );
}
