'use client';

import { useState } from 'react';
import { Search, Copy, Check, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';

const SITEMAP_URL = 'https://taptifs.in/sitemap.xml';

export default function SearchConsoleSection({ verified }: { verified: boolean }) {
  const [copied, setCopied] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const copySitemap = async () => {
    await navigator.clipboard.writeText(SITEMAP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Search className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Google Search Console</h3>
              <p className="text-sm text-gray-500">Monitor search performance and indexing</p>
            </div>
          </div>
          {verified ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
              <XCircle className="w-3.5 h-3.5" /> Not Verified
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Sitemap URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={SITEMAP_URL}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-600 cursor-default"
            />
            <button
              type="button"
              onClick={copySitemap}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Submit this URL in Search Console → Sitemaps.
          </p>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setGuideOpen(!guideOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span>How to verify via DNS TXT record</span>
            {guideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {guideOpen && (
            <div className="px-4 pb-4 text-sm text-gray-600 space-y-2 border-t border-gray-100 pt-3">
              <ol className="list-decimal list-inside space-y-1.5">
                <li>Go to <strong>Google Search Console</strong> → Add property → Domain.</li>
                <li>Copy the TXT record value Google provides (e.g. <code className="bg-gray-100 px-1 rounded">google-site-verification=xxxxxx</code>).</li>
                <li>Log in to your <strong>domain registrar</strong> (e.g. GoDaddy, Namecheap).</li>
                <li>Navigate to <strong>DNS settings</strong> → Add a new TXT record.</li>
                <li>Set <strong>Host</strong> to <code className="bg-gray-100 px-1 rounded">@</code> and <strong>Value</strong> to the verification string.</li>
                <li>Save and click <strong>Verify</strong> in Search Console (may take up to 48 hours).</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
