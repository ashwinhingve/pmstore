'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * SiteChrome — decides which parts of the public storefront chrome (header,
 * footer and the floating storefront widgets) are shown around the page body.
 *
 * The public Header (announcement strip + main nav) shows on every page,
 * including `/admin/*`, so the admin panel wears the same orange site navbar.
 * The Footer, compare tray and WhatsApp button stay hidden on `/admin/*` —
 * admin pages keep the navbar but otherwise get a clean, self-contained shell.
 *
 * The chrome is passed in as already-rendered nodes so the (server-rendered)
 * Header/Footer stay Server Components; this client wrapper only toggles them.
 */
export function SiteChrome({
  header,
  footer,
  floating,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  floating: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  return (
    <div className="flex min-h-screen flex-col">
      {header}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {!isAdmin && footer}
      {!isAdmin && floating}
    </div>
  );
}
