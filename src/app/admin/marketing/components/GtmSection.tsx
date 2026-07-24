'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Save, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  initialGtmId: string;
  initialGtmEnabled: boolean;
}

export default function GtmSection({ initialGtmId, initialGtmEnabled }: Props) {
  const router = useRouter();
  const [gtmId, setGtmId] = useState(initialGtmId);
  const [enabled, setEnabled] = useState(initialGtmEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const connected = !!initialGtmId;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gtm_id: gtmId.trim(), gtm_enabled: enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'GTM settings saved.' });
        router.refresh();
      } else {
        const detail = data.details?.fieldErrors?.gtm_id?.[0] || data.error || 'Failed to save';
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
    <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)]">
      <div className="p-6 border-b border-[var(--foil-soft)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--foil-soft)] rounded-lg">
              <Tag className="w-5 h-5 text-[var(--ink)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--ink)]">Google Tag Manager</h3>
              <p className="text-sm text-[var(--ink-40)]">Central hub for all tracking scripts</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {connected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--mint-soft)] text-[var(--mint)] border border-[var(--mint)]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--foil-soft)] text-[var(--ink-40)] border border-[var(--foil-soft)]">
                <XCircle className="w-3.5 h-3.5" /> Not Connected
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">
            GTM Container ID
          </label>
          <input
            type="text"
            value={gtmId}
            onChange={(e) => setGtmId(e.target.value)}
            placeholder="GTM-XXXXXXX"
            className="w-full px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)] focus:border-transparent"
          />
          <p className="mt-1 text-xs text-[var(--ink-40)]">Found in your GTM account dashboard.</p>
        </div>

        <div className="flex items-center justify-between p-4 bg-[var(--paper)] rounded-lg border border-[var(--foil-soft)]">
          <div>
            <p className="text-sm font-medium text-[var(--ink)]">Use GTM as primary tracking hub</p>
            <p className="text-xs text-[var(--ink-40)] mt-0.5">
              When enabled, GA, Ads & Pixel scripts are disabled — GTM manages them instead.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              enabled ? 'bg-[var(--mint)]' : 'bg-[var(--foil-soft)]'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {enabled && (
          <div className="bg-[var(--mint-soft)] border border-[var(--mint)] rounded-lg p-4 text-sm text-[var(--mint)]">
            <strong>GTM is active.</strong> All tracking is routed through GTM. Direct GA, Google
            Ads, and Meta Pixel script injection is disabled.
          </div>
        )}
      </div>

      <div className="p-6 border-t border-[var(--foil-soft)] flex items-center justify-between">
        {message ? (
          <p className={`text-sm font-medium ${message.type === 'success' ? 'text-[var(--mint)]' : 'text-[var(--ink-70)]'}`}>
            {message.text}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--ink)] text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
