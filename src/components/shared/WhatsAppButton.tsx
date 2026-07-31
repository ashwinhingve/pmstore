'use client';

import { MessageCircle } from 'lucide-react';
import { CONTACT } from '@/lib/constants';

/**
 * Sticky click-to-chat button, bottom-right on every page. Opens a WhatsApp
 * conversation with the store's support number (CONTACT.whatsappHref).
 *
 * It sits bottom-right, clear of the CompareTray (fixed bottom-left, shown only
 * while a comparison is half-built), so the two never overlap.
 *
 * Resting state is a 56px circle; on pointer hover it expands to reveal a
 * "Chat with us" label. It is a plain wa.me link — independent of the WhatsApp
 * auto-reply bot, which is a separate, server-side integration.
 */
export function WhatsAppButton() {
  return (
    <a
      href={CONTACT.whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      className="group fixed z-40 flex h-14 items-center rounded-[var(--radius-pill)] bg-[var(--mint)] pl-4 pr-4 text-[var(--paper-card)] shadow-[var(--shadow-lg)] outline-none transition-[background-color,transform] duration-[var(--dur-base)] ease-[var(--ease-out)] hover:bg-[var(--mint-deep)] focus-visible:ring-2 focus-visible:ring-[var(--mint)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)] motion-reduce:transition-none print:hidden"
      style={{
        bottom: `calc(1rem + env(safe-area-inset-bottom, 0px))`,
        right: `calc(1rem + env(safe-area-inset-right, 0px))`,
      }}
    >
      <MessageCircle className="h-6 w-6 shrink-0" aria-hidden="true" />
      {/* Expands on hover/focus for pointer users; the aria-label always names it. */}
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-[0.9375rem] font-semibold opacity-0 transition-[max-width,opacity,margin] duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:ml-2 group-hover:max-w-[10rem] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-[10rem] group-focus-visible:opacity-100 motion-reduce:transition-none">
        Chat with us
      </span>
    </a>
  );
}
