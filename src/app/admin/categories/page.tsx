'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Save,
  X,
  Upload,
  ImageIcon,
  Loader2,
} from 'lucide-react';

interface CategoryItem {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  image: string;
  order: number;
  isActive: boolean;
}

// ── Image upload helper ─────────────────────────────────────────
async function uploadCategoryImage(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', 'pmstore/categories');
  const res = await fetch('/api/admin/products/upload-image', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Image upload failed');
    return null;
  }
  return data.url;
}

// ── Small inline image uploader ─────────────────────────────────
function CategoryImageInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadCategoryImage(file);
    setUploading(false);
    if (url) onChange(url);
    e.target.value = '';
  }

  return (
    <div className="flex items-center gap-2">
      {/* Thumbnail */}
      <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0">
        {value ? (
          <Image src={value} alt="Category" fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-gray-300" />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-gray-300 hover:border-amber-400 hover:bg-amber-50 text-gray-600 hover:text-amber-700 transition-colors disabled:opacity-50"
      >
        {uploading ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</>
        ) : (
          <><Upload className="w-3 h-3" /> {value ? 'Change' : 'Upload'}</>
        )}
      </button>

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-xs text-red-500 hover:text-red-700 transition-colors"
          title="Remove image"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', icon: '', image: '', order: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', icon: '', image: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          icon: addForm.icon.trim(),
          image: addForm.image.trim(),
          order: categories.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCategories([...categories, data.category]);
      setAddForm({ name: '', icon: '', image: '' });
      setShowAdd(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add category');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCategories(categories.map((c) => (c._id === id ? data.category : c)));
      setEditingId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update category');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category? Products using it will keep their category name.')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setCategories(categories.filter((c) => c._id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  }

  async function toggleActive(cat: CategoryItem) {
    try {
      const res = await fetch(`/api/admin/categories/${cat._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCategories(categories.map((c) => (c._id === cat._id ? data.category : c)));
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 mx-auto border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage product categories — upload images for circles on homepage
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-gradient-to-r from-amber-600 to-red-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">New Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g., Diabetes Care"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emoji Icon (fallback)</label>
              <Input
                value={addForm.icon}
                onChange={(e) => setAddForm({ ...addForm, icon: e.target.value })}
                placeholder="e.g., 🌶️  (used if no image)"
                className="w-40"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Category Image</label>
            <CategoryImageInput
              value={addForm.image}
              onChange={(url) => setAddForm({ ...addForm, image: url })}
            />
            <p className="text-xs text-gray-400 mt-1">Shown as circle on homepage. If no image, emoji fallback is used.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleAdd} disabled={saving} size="sm" className="bg-gradient-to-r from-amber-600 to-red-700">
              <Save className="w-4 h-4 mr-1" />
              {saving ? 'Saving...' : 'Save Category'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowAdd(false); setAddForm({ name: '', icon: '', image: '' }); }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Image</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Icon</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No categories yet. Add your first category above.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-gray-50">
                  {editingId === cat._id ? (
                    <>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          value={editForm.order}
                          onChange={(e) => setEditForm({ ...editForm, order: parseInt(e.target.value) || 0 })}
                          className="w-16"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CategoryImageInput
                          value={editForm.image}
                          onChange={(url) => setEditForm({ ...editForm, image: url })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={editForm.icon}
                          onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                          className="w-16"
                          placeholder="🛒"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{cat.slug}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {cat.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" onClick={() => handleUpdate(cat._id)} disabled={saving}>
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <GripVertical className="w-3 h-3 text-gray-300" />
                          {cat.order}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative w-9 h-9 rounded-full overflow-hidden border border-gray-200 bg-gray-50">
                          {cat.image ? (
                            <Image src={cat.image} alt={cat.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xl">{cat.icon || '📦'}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{cat.slug}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(cat)}
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                            cat.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {cat.isActive ? 'Active' : 'Hidden'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(cat._id);
                              setEditForm({ name: cat.name, icon: cat.icon, image: cat.image || '', order: cat.order });
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(cat._id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        💡 Tip: Upload a square image for best results in the circular category display on the homepage.
        If no image is uploaded, the emoji icon will be shown as a fallback.
      </p>
    </div>
  );
}
