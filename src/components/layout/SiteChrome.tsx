'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * SiteChrome — decides whether the public storefront chrome (header, footer and
 * the floating storefront widgets) is shown around the page body.
 *
 * On `/admin/*` the admin panel provides its own header and sidebar, so the
 * public Header (announcement strip + About/Contact nav), Footer, compare tray
 * and WhatsApp button are hidden — admin pages get a clean, self-contained shell.
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
      {!isAdmin && header}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {!isAdmin && footer}
      {!isAdmin && floating}
    </div>
  );
}
