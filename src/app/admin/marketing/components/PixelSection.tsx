'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Share2, Save, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  initialPixelId: string;
  gtmEnabled: boolean;
}

export default function PixelSection({ initialPixelId, gtmEnabled }: Props) {
  const router = useRouter();
  const [pixelId, setPixelId] = useState(initialPixelId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const connected = !!initialPixelId;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meta_pixel_id: pixelId.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Meta Pixel saved.' });
        router.refresh();
      } else {
        const detail = data.details?.fieldErrors?.meta_pixel_id?.[0] || data.error || 'Failed to save';
        setMessage({ type: 'error', text: detail });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Share2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Meta Pixel</h3>
              <p className="text-sm text-gray-500">Facebook & Instagram ad tracking</p>
            </div>
          </div>
          {connected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
              <XCircle className="w-3.5 h-3.5" /> Not Connected
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {gtmEnabled && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
            GTM is active — Meta Pixel events are managed through your GTM container.
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Pixel ID
          </label>
          <input
            type="text"
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value)}
            placeholder="123456789012345"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-400">
            Found in Meta Business Manager → Events Manager → your Pixel.
          </p>
        </div>
      </div>

      <div className="p-6 border-t border-gray-200 flex items-center justify-between">
        {message ? (
          <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {message.text}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-red-700 text-white font-medium rounded-lg hover:from-amber-700 hover:to-red-800 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
