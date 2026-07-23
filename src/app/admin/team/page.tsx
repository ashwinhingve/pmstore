'use client';

import { useState, useEffect, useRef } from 'react';
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
  UserCircle,
  Loader2,
  Linkedin,
  Twitter,
  Mail,
} from 'lucide-react';

interface TeamMember {
  _id: string;
  name: string;
  designation: string;
  photo: string;
  photoPublicId: string;
  bio: string;
  linkedin: string;
  twitter: string;
  email: string;
  order: number;
  isActive: boolean;
}

const EMPTY_FORM = {
  name: '',
  designation: '',
  photo: '',
  photoPublicId: '',
  bio: '',
  linkedin: '',
  twitter: '',
  email: '',
};

// ── Photo Upload Helper ─────────────────────────────────────────
async function uploadPhoto(file: File): Promise<{ url: string; publicId: string } | null> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/admin/team/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Photo upload failed');
    return null;
  }
  return { url: data.url, publicId: data.publicId };
}

// ── Inline Photo Uploader ───────────────────────────────────────
function PhotoUploader({
  value,
  publicId,
  onChange,
}: {
  value: string;
  publicId: string;
  onChange: (url: string, publicId: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadPhoto(file);
    setUploading(false);
    if (result) onChange(result.url, result.publicId);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        onClick={() => fileRef.current?.click()}
        className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-amber-400 cursor-pointer bg-gray-50 transition-colors group"
      >
        {value ? (
          <>
            <Image src={value} alt="Photo" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
              <Upload className="w-6 h-6 text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-amber-500 transition-colors">
            {uploading ? (
              <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
            ) : (
              <>
                <UserCircle className="w-10 h-10 mb-1" />
                <span className="text-[10px]">Upload Photo</span>
              </>
            )}
          </div>
        )}
        {uploading && value && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="w-7 h-7 animate-spin text-white" />
          </div>
        )}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange('', '')}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Remove photo
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Member Form ─────────────────────────────────────────────────
function MemberForm({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  title,
}: {
  form: typeof EMPTY_FORM;
  onChange: (f: typeof EMPTY_FORM) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
}) {
  return (
    <div className="border-2 border-amber-300 rounded-xl p-5 bg-amber-50/40">
      <h3 className="font-semibold text-gray-800 mb-5">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Photo */}
        <div className="flex flex-col items-center">
          <label className="block text-xs font-medium text-gray-600 mb-2">Photo</label>
          <PhotoUploader
            value={form.photo}
            publicId={form.photoPublicId}
            onChange={(url, pid) => onChange({ ...form, photo: url, photoPublicId: pid })}
          />
        </div>

        {/* Main fields */}
        <div className="md:col-span-2 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
              <Input
                value={form.name}
                onChange={(e) => onChange({ ...form, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Designation *</label>
              <Input
                value={form.designation}
                onChange={(e) => onChange({ ...form, designation: e.target.value })}
                placeholder="e.g., Founder & CEO"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => onChange({ ...form, bio: e.target.value })}
              placeholder="Short biography shown on hover..."
              rows={3}
              className="w-full text-sm rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          {/* Social links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                <Linkedin className="w-3 h-3" /> LinkedIn URL
              </label>
              <Input
                value={form.linkedin}
                onChange={(e) => onChange({ ...form, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                <Twitter className="w-3 h-3" /> Twitter/X URL
              </label>
              <Input
                value={form.twitter}
                onChange={(e) => onChange({ ...form, twitter: e.target.value })}
                placeholder="https://twitter.com/..."
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <Input
                value={form.email}
                onChange={(e) => onChange({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-5">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving}
          className="bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-700 hover:to-red-800 text-white"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4 mr-1" /> Save Member</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const res = await fetch('/api/admin/team');
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!addForm.name.trim() || !addForm.designation.trim()) {
      alert('Name and designation are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addForm, order: members.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers([...members, data.member]);
      setAddForm({ ...EMPTY_FORM });
      setShowAdd(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add member');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editForm.name.trim() || !editForm.designation.trim()) {
      alert('Name and designation are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(members.map((m) => (m._id === id ? data.member : m)));
      setEditingId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this team member? Their photo will also be removed.')) return;
    try {
      const res = await fetch(`/api/admin/team/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setMembers(members.filter((m) => m._id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete member');
    }
  }

  async function toggleActive(member: TeamMember) {
    try {
      const res = await fetch(`/api/admin/team/${member._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(members.map((m) => (m._id === member._id ? data.member : m)));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function moveMember(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= members.length) return;
    const updated = [...members];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    const reordered = updated.map((m, i) => ({ ...m, order: i }));
    setMembers(reordered);
    // Persist new orders
    await Promise.all(
      reordered.map((m) =>
        fetch(`/api/admin/team/${m._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: m.order }),
        })
      )
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 mx-auto border-[3px] border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meet Our Team</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage team members displayed on the About page
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          className="bg-gradient-to-r from-amber-600 to-red-700 hover:from-amber-700 hover:to-red-800 text-white"
          disabled={showAdd}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Member
        </Button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <MemberForm
          form={addForm}
          onChange={setAddForm}
          onSave={handleAdd}
          onCancel={() => { setShowAdd(false); setAddForm({ ...EMPTY_FORM }); }}
          saving={saving}
          title="New Team Member"
        />
      )}

      {/* Members List */}
      {members.length === 0 && !showAdd ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <UserCircle className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No team members yet</p>
          <p className="text-sm text-gray-400 mt-1">Click &quot;Add Member&quot; to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member, index) => (
            <div key={member._id}>
              {editingId === member._id ? (
                <MemberForm
                  form={editForm}
                  onChange={setEditForm}
                  onSave={() => handleUpdate(member._id)}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                  title={`Editing: ${member.name}`}
                />
              ) : (
                <div
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    member.isActive
                      ? 'border-gray-200 bg-white hover:border-amber-200'
                      : 'border-gray-100 bg-gray-50 opacity-60'
                  }`}
                >
                  {/* Photo */}
                  <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-amber-100 to-red-100">
                    {member.photo ? (
                      <Image src={member.photo} alt={member.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserCircle className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{member.name}</p>
                    <p className="text-sm text-amber-600 truncate">{member.designation}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {member.linkedin && (
                        <Linkedin className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      {member.twitter && (
                        <Twitter className="w-3.5 h-3.5 text-sky-500" />
                      )}
                      {member.email && (
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      {!member.linkedin && !member.twitter && !member.email && (
                        <span className="text-xs text-gray-400">No social links</span>
                      )}
                    </div>
                  </div>

                  {/* Order */}
                  <span className="text-xs font-medium text-gray-400 w-6 text-center flex-shrink-0">
                    #{index + 1}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveMember(index, -1)}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => moveMember(index, 1)}
                        disabled={index === members.length - 1}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>

                    {/* Toggle active */}
                    <button
                      onClick={() => toggleActive(member)}
                      className={`p-2 rounded-lg transition-colors ${
                        member.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={member.isActive ? 'Hide on About page' : 'Show on About page'}
                    >
                      {member.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => {
                        setEditingId(member._id);
                        setEditForm({
                          name: member.name,
                          designation: member.designation,
                          photo: member.photo,
                          photoPublicId: member.photoPublicId,
                          bio: member.bio,
                          linkedin: member.linkedin,
                          twitter: member.twitter,
                          email: member.email,
                        });
                      }}
                      className="p-2 rounded-lg hover:bg-amber-50 text-amber-700 transition-colors"
                      title="Edit member"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(member._id)}
                      className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                      title="Delete member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        💡 Members marked as hidden will not appear on the About page.
        Reorder by using the up/down arrows.
      </p>
    </div>
  );
}
