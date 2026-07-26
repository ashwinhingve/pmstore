'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { toast } from '@/store/useToastStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
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
    toast.error(data.error || "Couldn't upload the image. Try again.");
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
      <div className="relative w-10 h-10 rounded-full overflow-hidden border border-[var(--foil-soft)] bg-[var(--foil-soft)] flex-shrink-0">
        {value ? (
          <Image src={value} alt="Category" fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-[var(--ink-40)]" />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[var(--foil-soft)] hover:border-[var(--mint)] hover:bg-[var(--mint-soft)] text-[var(--ink-70)] hover:text-[var(--mint)] transition-colors disabled:opacity-50"
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
          className="text-xs text-[var(--ink-70)] hover:text-[var(--ink)] transition-colors"
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
      toast.error(err.message || "Couldn't add the category. Try again.");
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
      toast.error(err.message || "Couldn't update the category. Try again.");
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
      toast.error(err.message || "Couldn't delete the category. Try again.");
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
      toast.error(err.message || "Couldn't update the category status. Try again.");
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 mx-auto border-3 border-[var(--ink)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl">
      <AdminPageHeader
        title="Categories"
        description="Manage product categories — upload images for circles on homepage"
      >
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-[var(--ink)] hover:opacity-90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </AdminPageHeader>

      {/* Add Form */}
      {showAdd && (
        <div className="mb-6 bg-[var(--foil-soft)] border border-[var(--foil)] rounded-xl p-5">
          <h3 className="font-semibold text-[var(--ink)] mb-4">New Category</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink)] mb-1">Name *</label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                placeholder="e.g., Diabetes Care"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink)] mb-1">Emoji Icon (fallback)</label>
              <Input
                value={addForm.icon}
                onChange={(e) => setAddForm({ ...addForm, icon: e.target.value })}
                placeholder="e.g., 🌶️  (used if no image)"
                className="w-40"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--ink)] mb-2">Category Image</label>
            <CategoryImageInput
              value={addForm.image}
              onChange={(url) => setAddForm({ ...addForm, image: url })}
            />
            <p className="text-xs text-[var(--ink-40)] mt-1">Shown as circle on homepage. If no image, emoji fallback is used.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleAdd} disabled={saving} size="sm" className="bg-[var(--ink)] hover:opacity-90 text-white">
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
      <div className="bg-[var(--paper-card)] rounded-xl border border-[var(--foil-soft)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--foil-soft)] border-b border-[var(--foil-soft)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase">Order</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase">Image</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase">Icon</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--ink-70)] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--foil-soft)]">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--ink-40)]">
                  No categories yet. Add your first category above.
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-[var(--foil-soft)]">
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
                      <td className="px-4 py-3 text-sm text-[var(--ink-40)]">{cat.slug}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${cat.isActive ? 'bg-[var(--mint-soft)] text-[var(--mint)]' : 'bg-[var(--foil-soft)] text-[var(--ink-70)]'}`}>
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
                        <span className="text-sm text-[var(--ink-40)] flex items-center gap-1">
                          <GripVertical className="w-3 h-3 text-[var(--ink-40)]" />
                          {cat.order}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative w-9 h-9 rounded-full overflow-hidden border border-[var(--foil-soft)] bg-[var(--foil-soft)]">
                          {cat.image ? (
                            <Image src={cat.image} alt={cat.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-[var(--ink-40)]" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xl">{cat.icon || '📦'}</td>
                      <td className="px-4 py-3 font-medium text-[var(--ink)]">{cat.name}</td>
                      <td className="px-4 py-3 text-sm text-[var(--ink-40)]">{cat.slug}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(cat)}
                          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                            cat.isActive
                              ? 'bg-[var(--mint-soft)] text-[var(--mint)] hover:opacity-80'
                              : 'bg-[var(--foil-soft)] text-[var(--ink-70)] hover:opacity-80'
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
                            className="text-[var(--ink-70)] hover:text-[var(--ink)] hover:bg-[var(--foil-soft)]"
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

      <p className="text-xs text-[var(--ink-40)] mt-3">
        💡 Tip: Upload a square image for best results in the circular category display on the homepage.
        If no image is uploaded, the emoji icon will be shown as a fallback.
      </p>
    </div>
  );
}
