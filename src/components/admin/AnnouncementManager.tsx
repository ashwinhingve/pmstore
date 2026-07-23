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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Megaphone className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Announcement Banner</h3>
                <p className="text-sm text-gray-500">
                  Scrolling banner displayed at the top of your site
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Announcements List */}
        <div className="p-6 space-y-4">
          {!enabled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
              Banner is currently disabled. Enable it to show announcements on your site.
            </div>
          )}

          {announcements.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Megaphone className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="font-medium">No announcements yet</p>
              <p className="text-sm">Add your first announcement below</p>
            </div>
          )}

          {announcements.map((a, index) => (
            <div
              key={a.id}
              className={`border rounded-lg p-4 transition-colors ${
                a.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <GripVertical className="w-5 h-5 text-gray-300 mt-2.5 flex-shrink-0" />

                {/* Emoji Input */}
                <div className="flex-shrink-0">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={a.emoji}
                    onChange={(e) => updateAnnouncement(a.id, 'emoji', e.target.value)}
                    className="w-14 h-10 text-center text-xl border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="🎉"
                  />
                </div>

                {/* Text Input */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Message #{index + 1}
                  </label>
                  <input
                    type="text"
                    value={a.text}
                    onChange={(e) => updateAnnouncement(a.id, 'text', e.target.value)}
                    placeholder="Enter announcement text..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>

                {/* Active Toggle */}
                <button
                  type="button"
                  onClick={() => updateAnnouncement(a.id, 'isActive', !a.isActive)}
                  className={`mt-6 p-2 rounded-lg transition-colors ${
                    a.isActive
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={a.isActive ? 'Visible' : 'Hidden'}
                >
                  {a.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => removeAnnouncement(a.id)}
                  className="mt-6 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Preview */}
              {a.text && (
                <div className="mt-3 ml-8 bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg inline-flex items-center gap-2">
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
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Announcement
          </button>
        </div>

        {/* Save */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          {message && (
            <p
              className={`text-sm font-medium ${
                message.type === 'success' ? 'text-green-600' : 'text-red-600'
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
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-red-700 text-white font-medium rounded-lg hover:from-amber-700 hover:to-red-800 disabled:opacity-50 transition-all"
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
