'use client';

import { CONTACT } from '@/lib/constants';

/** The official WhatsApp glyph (phone in a speech bubble), inline so it fills currentColor. */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.335-1.652a11.97 11.97 0 005.71 1.454h.006c6.585 0 11.946-5.359 11.949-11.893a11.82 11.82 0 00-3.487-8.46z" />
    </svg>
  );
}

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
      <WhatsAppGlyph className="h-6 w-6 shrink-0" />
      {/* Expands on hover/focus for pointer users; the aria-label always names it. */}
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-[0.9375rem] font-semibold opacity-0 transition-[max-width,opacity,margin] duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:ml-2 group-hover:max-w-[10rem] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-[10rem] group-focus-visible:opacity-100 motion-reduce:transition-none">
        Chat with us
      </span>
    </a>
  );
}
