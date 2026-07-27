'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Drawer } from '@/components/ui/drawer';
import { AdminNavLinks } from '@/components/admin/AdminSidebar';
import {
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Menu,
} from 'lucide-react';

interface AdminHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function AdminHeader({ user }: AdminHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--foil-soft)] bg-[var(--paper-card)]/95 backdrop-blur">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left side: Mobile menu button + Title */}
          <div className="flex items-center">
            <button
              type="button"
              className="-ml-0.5 -mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ink-40)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)] lg:hidden"
              onClick={() => setShowMobileMenu(true)}
              aria-expanded={showMobileMenu}
            >
              <span className="sr-only">Open admin navigation</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="ml-4 lg:ml-0">
              <h1 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--ink)]">Admin panel</h1>
            </div>
          </div>

          {/* Right side: Notifications + User menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button
              type="button"
              className="relative rounded-full p-2 text-[var(--ink-40)] hover:text-[var(--ink)] hover:bg-[var(--foil-soft)]"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5" />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-[var(--brand)] ring-2 ring-[var(--paper-card)]" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[var(--foil-soft)]"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {/* User avatar */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ink)] font-semibold text-[var(--paper-card)] shadow-[var(--shadow-xs)] ring-1 ring-[var(--foil-soft)]">
                  {user.name?.charAt(0).toUpperCase() || 'A'}
                </div>

                {/* User info */}
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-[var(--ink)]">{user.name || 'Admin'}</p>
                  <p className="text-xs text-[var(--ink-40)]">{user.email}</p>
                </div>

                <ChevronDown className="h-4 w-4 text-[var(--ink-40)]" />
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-lg bg-[var(--paper-card)] shadow-[var(--shadow-md)] border border-[var(--foil-soft)]">
                    <div className="p-2">
                      {/* Profile info */}
                      <div className="px-3 py-2 border-b border-[var(--foil-soft)] mb-2">
                        <p className="text-sm font-medium text-[var(--ink)]">{user.name}</p>
                        <p className="text-xs text-[var(--ink-40)] truncate">{user.email}</p>
                      </div>

                      {/* Menu items */}
                      <button
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--ink)] hover:bg-[var(--foil-soft)]"
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/admin/settings');
                        }}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>

                      <button
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--ink)] hover:bg-[var(--foil-soft)]"
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/profile');
                        }}
                      >
                        <User className="h-4 w-4" />
                        View profile
                      </button>

                      <div className="my-2 border-t border-[var(--foil-soft)]" />

                      <button
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--ink-70)] hover:bg-[var(--foil-soft)]"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      <Drawer
        open={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        title="Admin navigation"
        side="left"
        className="lg:hidden"
      >
        <div className="py-4">
          <AdminNavLinks onNavigate={() => setShowMobileMenu(false)} />
        </div>
      </Drawer>
    </header>
  );
}
