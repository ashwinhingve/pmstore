'use client';

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Truck, TrendingDown, FlaskConical, ShieldCheck, MessageCircle, X, Megaphone } from 'lucide-react';
import type { BannerContent } from '@/lib/site-settings';

const icons: Record<string, typeof Truck> = { truck: Truck, savings: TrendingDown, lab: FlaskConical, shield: ShieldCheck, message: MessageCircle };
const DISMISS_KEY = 'pmstore-announce-dismissed';
function subscribeDismiss(listener: () => void) {
  window.addEventListener('storage', listener); window.addEventListener('pmstore-announcement-dismissed', listener);
  return () => { window.removeEventListener('storage', listener); window.removeEventListener('pmstore-announcement-dismissed', listener); };
}
function subscribeReducedMotion(listener: () => void) {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
function isReducedMotion() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
function isDismissed() { try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } }
export function AnnouncementBar({ content }: { content?: BannerContent }) {
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, isReducedMotion, () => false);
  const storedDismissal = useSyncExternalStore(subscribeDismiss, isDismissed, () => false);
  const [localDismissal, setLocalDismissal] = useState(false);
  const hidden = storedDismissal || localDismissal;
  const [duration, setDuration] = useState(20);
  const track = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!track.current) return;
    const element = track.current;
    const measure = () => setDuration(Math.max(20, element.scrollWidth / 2 / 45));
    measure(); const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, [content, reduceMotion, hidden]);
  if (hidden || !content?.enabled || !content.announcements.length) return null;
  const list = (duplicate = false) => <ul aria-hidden={duplicate || undefined} className="flex shrink-0 items-center gap-8 px-4">
    {content.announcements.map((item, index) => {
      const Icon = icons[item.icon ?? ''] ?? Megaphone;
      return <li key={index} className="flex items-center gap-2 whitespace-nowrap">
        {item.emoji ? <span aria-hidden="true">{item.emoji}</span> : <Icon className="h-4 w-4 shrink-0 text-[var(--brand-ink)]/80 sm:h-5 sm:w-5" aria-hidden="true" />}
        <span>{item.text}</span>
      </li>;
    })}
  </ul>;
  return <div className="relative overflow-hidden bg-[var(--brand-deep)] text-sm text-[var(--brand-ink)]/90 sm:text-base print:hidden">
    <div className="mx-auto flex h-11 max-w-[1600px] items-center sm:h-12">
      {reduceMotion ? <div tabIndex={0} className="flex-1 min-w-0 overflow-x-auto" aria-label="Store offers — scroll to read all announcements" role="region">{list()}</div> :
        <div tabIndex={0} className="group flex flex-1 min-w-0 overflow-hidden" aria-label="Store offers" role="region">
          <div ref={track} style={{ animationDuration: `${duration}s` }} className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">{list()}{list(true)}</div>
        </div>}
      <button type="button" aria-label="Dismiss offers" onClick={() => { setLocalDismissal(true); try { sessionStorage.setItem(DISMISS_KEY, '1'); window.dispatchEvent(new Event('pmstore-announcement-dismissed')); } catch {} }} className="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--brand-ink)]/70 sm:h-12"><X className="h-4 w-4" aria-hidden="true" /></button>
    </div>
  </div>;
}
