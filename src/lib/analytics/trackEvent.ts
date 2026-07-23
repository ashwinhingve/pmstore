interface TrackEventParams {
  name: string;
  category?: string;
  value?: number;
  [key: string]: unknown;
}

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag: (...args: unknown[]) => void;
    fbq: (...args: unknown[]) => void;
  }
}

/**
 * Universal event tracker.
 * - If GTM is loaded (window.dataLayer exists) → push to dataLayer.
 * - Otherwise → call gtag (GA4/Ads) and fbq (Meta Pixel) directly.
 */
export function trackEvent({ name, category, value, ...rest }: TrackEventParams): void {
  if (typeof window === 'undefined') return;

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: name, event_category: category, value, ...rest });
    return;
  }

  if (typeof window.gtag === 'function') {
    window.gtag('event', name, { event_category: category, value, ...rest });
  }

  if (typeof window.fbq === 'function') {
    window.fbq('track', name);
  }
}
