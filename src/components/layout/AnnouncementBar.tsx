'use client';

import { useEffect, useState } from 'react';
import { Truck, TrendingDown, FlaskConical, ShieldCheck, MessageCircle, X } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { CONTACT } from '@/lib/constants';

/**
 * AnnouncementBar — a slim scrolling strip of offers above the header. Replaces
 * the old static utility bar. Scrolls away (not sticky) so it never eats into
 * the sticky header's offset.
 *
 * The marquee pauses on hover and, under prefers-reduced-motion, renders a
 * static row instead of scrolling. Dismissible for the session via sessionStorage
 * (never localStorage — that's reserved for the cart). Numbers use --font-data
 * per the mono rule.
 */

const OFFERS: { icon: typeof Truck; text: string; value?: string }[] = [
  { icon: Truck, text: 'Free home delivery across Bhopal' },
  { icon: TrendingDown, value: '60–70%', text: 'off with generic brands' },
  { icon: FlaskConical, value: '30–40%', text: 'off pathology & lab tests' },
  { icon: ShieldCheck, text: 'Pharmacist-checked, government-approved' },
  { icon: MessageCircle, text: `WhatsApp or call ${CONTACT.phone} to order` },
];

const DISMISS_KEY = 'pmstore-announce-dismissed';

function OfferList({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-8 px-4" aria-hidden={ariaHidden || undefined}>
      {OFFERS.map(({ icon: Icon, text, value }, i) => (
        <li key={i} className="flex items-center gap-1.5 whitespace-nowrap">
          <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--brand-ink)]/80" aria-hidden="true" />
          {value && <span className="data font-semibold text-[var(--brand-ink)]">{value}</span>}
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

export function AnnouncementBar() {
  const reduceMotion = useReducedMotion();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') setHidden(true);
    } catch {
      /* sessionStorage unavailable — keep the bar shown */
    }
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore — dismissal just won't persist */
    }
  };

  return (
    <div className="relative overflow-hidden bg-[image:var(--surface-hero)] text-xs text-[var(--brand-ink)]/90 print:hidden">
      <div className="mx-auto flex h-9 max-w-[1600px] items-center">
        {reduceMotion ? (
          <div className="flex-1 overflow-hidden" aria-label="Store offers" role="region">
            <OfferList />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden" aria-label="Store offers" role="region">
            <div className="flex w-max animate-marquee items-center hover:[animation-play-state:paused]">
              <OfferList />
              <OfferList ariaHidden />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss offers"
          className="flex h-9 w-11 shrink-0 items-center justify-center text-[var(--brand-ink)]/70 transition-colors duration-[var(--dur-fast)] hover:text-[var(--brand-ink)]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
