'use client';

import { useState } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { AdminNavLinks } from '@/components/admin/AdminSidebar';
import { Menu } from 'lucide-react';

/**
 * AdminHeader — mobile-only admin navigation bar.
 *
 * On desktop the admin sections live in the left sidebar and the orange site
 * navbar (rendered by SiteChrome) sits on top, so this bar is hidden. On mobile
 * the sidebar is hidden, so this slim bar exposes a hamburger that opens the
 * admin navigation drawer. Account actions (profile, sign out) live in the site
 * navbar's user menu, so they are intentionally not duplicated here.
 */
export default function AdminHeader() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <div className="border-b border-[var(--foil-soft)] bg-[var(--paper-card)] lg:hidden">
      <div className="flex h-12 items-center gap-1 px-4">
        <button
          type="button"
          className="-ml-1.5 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-40)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]"
          onClick={() => setShowMobileMenu(true)}
          aria-expanded={showMobileMenu}
        >
          <span className="sr-only">Open admin navigation</span>
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="font-[family-name:var(--font-display)] text-sm font-bold tracking-tight text-[var(--ink)]">
          Admin panel
        </span>
      </div>

      {/* Mobile navigation drawer */}
      <Drawer
        open={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        title="Admin navigation"
        side="left"
      >
        <div className="py-4">
          <AdminNavLinks onNavigate={() => setShowMobileMenu(false)} />
        </div>
      </Drawer>
    </div>
  );
}
