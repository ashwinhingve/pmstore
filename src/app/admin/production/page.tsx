'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  Image as ImageIcon,
  Video,
  Save,
  X,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface Slide {
  _id: string;
  type: 'image' | 'video';
  src: string;
  publicId?: string;
  title: string;
  description: string;
  order: number;
  isActive: boolean;
}

interface SlideForm {
  type: 'image' | 'video';
  src: string;
  title: string;
  description: string;
  isActive: boolean;
}

const emptyForm: SlideForm = {
  type: 'image',
  src: '',
  title: '',
  description: '',
  isActive: true,
};

export default function ProductionSlidesPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<SlideForm>(emptyForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchSlides = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/production-slides');
      const data = await res.json();
      if (data.slides) setSlides(data.slides);
    } catch {
      setError('Failed to load slides');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'tapti/production');

      const res = await fetch('/api/admin/products/upload-image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.image?.url) {
        setForm((prev) => ({ ...prev, src: data.image.url }));
      } else if (data.url) {
        setForm((prev) => ({ ...prev, src: data.url }));
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setError('Video file must be less than 50MB');
      return;
    }

    setUploadingVideo(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/products/upload-video', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.video?.url) {
        setForm((prev) => ({ ...prev, src: data.video.url }));
      } else {
        setError(data.error || 'Video upload failed');
      }
    } catch {
      setError('Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleAdd = async () => {
    if (!form.src || !form.title || !form.description) {
      setError('All fields are required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/production-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setForm(emptyForm);
        setShowAddForm(false);
        await fetchSlides();
        showSuccess('Slide added successfully');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add slide');
      }
    } catch {
      setError('Failed to add slide');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/production-slides/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setEditingId(null);
        setForm(emptyForm);
        await fetchSlides();
        showSuccess('Slide updated successfully');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update slide');
      }
    } catch {
      setError('Failed to update slide');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;

    try {
      const res = await fetch(`/api/admin/production-slides/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchSlides();
        showSuccess('Slide deleted successfully');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete slide');
      }
    } catch {
      setError('Failed to delete slide');
    }
  };

  const handleToggleActive = async (slide: Slide) => {
    try {
      await fetch(`/api/admin/production-slides/${slide._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !slide.isActive }),
      });
      await fetchSlides();
    } catch {
      setError('Failed to toggle slide visibility');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newSlides.length) return;

    [newSlides[index], newSlides[swapIndex]] = [newSlides[swapIndex], newSlides[index]];
    const slideIds = newSlides.map((s) => s._id);

    setSlides(newSlides);

    try {
      await fetch('/api/admin/production-slides', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slideIds }),
      });
    } catch {
      await fetchSlides(); // Revert on error
    }
  };

  const startEdit = (slide: Slide) => {
    setEditingId(slide._id);
    setForm({
      type: slide.type,
      src: slide.src,
      title: slide.title,
      description: slide.description,
      isActive: slide.isActive,
    });
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Process</h1>
          <p className="text-gray-600 mt-1">
            Manage images and videos shown in the &quot;Our Production Process&quot; section on the homepage.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(true);
            setEditingId(null);
            setForm(emptyForm);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-red-700 text-white rounded-lg font-medium hover:opacity-90 transition"
        >
          <Plus className="w-5 h-5" />
          Add Slide
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMsg}
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Slide' : 'Add New Slide'}
          </h3>
          <div className="space-y-4">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="image"
                    checked={form.type === 'image'}
                    onChange={() => setForm((prev) => ({ ...prev, type: 'image' }))}
                    className="text-amber-600"
                  />
                  <ImageIcon className="w-4 h-4 text-gray-500" />
                  Image
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="video"
                    checked={form.type === 'video'}
                    onChange={() => setForm((prev) => ({ ...prev, type: 'video' }))}
                    className="text-amber-600"
                  />
                  <Video className="w-4 h-4 text-gray-500" />
                  Video
                </label>
              </div>
            </div>

            {/* Media Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.type === 'image' ? 'Image' : 'Video URL'}
              </label>
              {form.type === 'image' ? (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <p className="text-sm text-amber-600">Uploading...</p>
                  )}
                  <p className="text-xs text-gray-500">Or enter URL directly:</p>
                  <input
                    type="text"
                    value={form.src}
                    onChange={(e) => setForm((prev) => ({ ...prev, src: e.target.value }))}
                    placeholder="/images/example.jpg or https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    onChange={handleVideoUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    disabled={uploadingVideo}
                  />
                  {uploadingVideo && (
                    <p className="text-sm text-purple-600">Uploading video... This may take a moment.</p>
                  )}
                  <p className="text-xs text-gray-500">Max 50MB. MP4, WebM, MOV. Or enter URL directly:</p>
                  <input
                    type="text"
                    value={form.src}
                    onChange={(e) => setForm((prev) => ({ ...prev, src: e.target.value }))}
                    placeholder="/images/video.mp4 or https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              )}
              {form.src && form.type === 'image' && (
                <div className="mt-2">
                  <img
                    src={form.src}
                    alt="Preview"
                    className="h-32 rounded-lg object-cover"
                  />
                </div>
              )}
              {form.src && form.type === 'video' && (
                <div className="mt-2">
                  <video
                    src={form.src}
                    controls
                    className="h-32 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Traditional Crushing Process"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe this step of the production process..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={editingId ? () => handleUpdate(editingId) : handleAdd}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-red-700 text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add Slide'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  cancelEdit();
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slides List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">
            Slides ({slides.length})
          </h3>
        </div>

        {slides.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No slides yet</p>
            <p className="text-sm mt-1">Add your first production process slide above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {slides.map((slide, index) => (
              <div
                key={slide._id}
                className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition ${
                  !slide.isActive ? 'opacity-50' : ''
                }`}
              >
                {/* Reorder */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <GripVertical className="w-4 h-4 text-gray-300" />
                  <button
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === slides.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Thumbnail */}
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {slide.type === 'image' ? (
                    <img
                      src={slide.src}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        slide.type === 'image'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {slide.type}
                    </span>
                    <h4 className="font-medium text-gray-900 truncate">{slide.title}</h4>
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">{slide.description}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(slide)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title={slide.isActive ? 'Hide slide' : 'Show slide'}
                  >
                    {slide.isActive ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(slide)}
                    className="p-2 text-gray-400 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(slide._id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
