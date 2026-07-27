'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, GripVertical, Save, Loader2, Eye, EyeOff, Megaphone } from 'lucide-react';

interface Announcement {
  id: string;
  text: string;
  emoji: string;
  isActive: boolean;
}

interface BannerData {
  enabled: boolean;
  announcements: Announcement[];
}

export default function AnnouncementManager({ initialData }: { initialData: BannerData }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialData.enabled);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialData.announcements);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const addAnnouncement = () => {
    setAnnouncements([
      ...announcements,
      {
        id: Math.random().toString(36).slice(2),
        text: '',
        emoji: '🎉',
        isActive: true,
      },
    ]);
  };

  const removeAnnouncement = (id: string) => {
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };

  const updateAnnouncement = (id: string, field: keyof Announcement, value: string | boolean) => {
    setAnnouncements(
      announcements.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcementBanner: {
            enabled,
            announcements: announcements.map((a) => ({
              text: a.text,
              emoji: a.emoji,
              isActive: a.isActive,
            })),
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        router.refresh();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Announcement Banner Section */}
      <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)]">
        <div className="p-6 border-b border-[var(--foil-soft)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--foil-soft)] rounded-lg">
                <Megaphone className="w-5 h-5 text-[var(--ink-70)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--ink)]">Announcement Banner</h3>
                <p className="text-sm text-[var(--ink-40)]">
                  Scrolling banner displayed at the top of your site
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                enabled ? 'bg-[var(--brand)]' : 'bg-[var(--foil)]'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-[var(--paper-card)] shadow-md transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Announcements List */}
        <div className="p-6 space-y-4">
          {!enabled && (
            <div className="bg-[var(--foil-soft)] border border-[var(--foil-soft)] rounded-lg p-4 text-sm text-[var(--ink-70)]">
              Banner is currently disabled. Enable it to show announcements on your site.
            </div>
          )}

          {announcements.length === 0 && (
            <div className="text-center py-8 text-[var(--ink-40)]">
              <Megaphone className="w-10 h-10 mx-auto mb-2 text-[var(--ink-40)]" />
              <p className="font-medium">No announcements yet</p>
              <p className="text-sm">Add your first announcement below</p>
            </div>
          )}

          {announcements.map((a, index) => (
            <div
              key={a.id}
              className={`border rounded-lg p-4 transition-colors ${
                a.isActive ? 'border-[var(--foil-soft)] bg-[var(--paper-card)]' : 'border-[var(--foil-soft)] bg-[var(--foil-soft)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <GripVertical className="w-5 h-5 text-[var(--ink-40)] mt-2.5 flex-shrink-0" />

                {/* Emoji Input */}
                <div className="flex-shrink-0">
                  <label className="block text-xs font-medium text-[var(--ink-40)] mb-1">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={a.emoji}
                    onChange={(e) => updateAnnouncement(a.id, 'emoji', e.target.value)}
                    className="w-14 h-10 text-center text-xl border border-[var(--foil-soft)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ink)] focus:border-transparent"
                    placeholder="🎉"
                  />
                </div>

                {/* Text Input */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-[var(--ink-40)] mb-1">
                    Message #{index + 1}
                  </label>
                  <input
                    type="text"
                    value={a.text}
                    onChange={(e) => updateAnnouncement(a.id, 'text', e.target.value)}
                    placeholder="Enter announcement text..."
                    className="w-full px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)] focus:border-transparent"
                  />
                </div>

                {/* Active Toggle */}
                <button
                  type="button"
                  onClick={() => updateAnnouncement(a.id, 'isActive', !a.isActive)}
                  className={`mt-6 p-2 rounded-lg transition-colors ${
                    a.isActive
                      ? 'text-[var(--brand)] hover:bg-[var(--brand-soft)]'
                      : 'text-[var(--ink-40)] hover:bg-[var(--foil-soft)]'
                  }`}
                  title={a.isActive ? 'Visible' : 'Hidden'}
                >
                  {a.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removeAnnouncement(a.id)}
                  className="mt-6 p-2 text-[var(--ink-70)] hover:text-[var(--ink)] hover:bg-[var(--foil-soft)] rounded-lg transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Preview */}
              {a.text && (
                <div className="mt-3 ml-8 bg-[var(--ink)] text-[var(--paper-card)] text-sm font-medium px-4 py-2 rounded-lg inline-flex items-center gap-2">
                  {a.emoji && <span>{a.emoji}</span>}
                  <span>{a.text}</span>
                </div>
              )}
            </div>
          ))}

          {/* Add Button */}
          <button
            type="button"
            onClick={addAnnouncement}
            className="w-full py-3 border-2 border-dashed border-[var(--foil-soft)] rounded-lg text-sm font-medium text-[var(--ink-40)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Announcement
          </button>
        </div>

        {/* Save */}
        <div className="p-6 border-t border-[var(--foil-soft)] flex items-center justify-between">
          {message && (
            <p
              className={`text-sm font-medium ${
                message.type === 'success' ? 'text-[var(--brand)]' : 'text-[var(--ink-70)]'
              }`}
            >
              {message.text}
            </p>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--ink)] text-[var(--paper-card)] font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
