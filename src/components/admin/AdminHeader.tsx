'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left side: Mobile menu button + Title */}
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden -ml-0.5 -mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
            <div className="ml-4 lg:ml-0">
              <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
            </div>
          </div>

          {/* Right side: Notifications + User menu */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button
              type="button"
              className="relative rounded-full p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5" />
              {/* Notification badge */}
              <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {/* User avatar */}
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-amber-600 to-red-700 flex items-center justify-center text-white font-semibold">
                  {user.name?.charAt(0).toUpperCase() || 'A'}
                </div>

                {/* User info */}
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900">{user.name || 'Admin'}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>

                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="p-2">
                      {/* Profile info */}
                      <div className="px-3 py-2 border-b border-gray-100 mb-2">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>

                      {/* Menu items */}
                      <button
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/admin/settings');
                        }}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>

                      <button
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => {
                          setShowUserMenu(false);
                          router.push('/profile');
                        }}
                      >
                        <User className="h-4 w-4" />
                        View Profile
                      </button>

                      <div className="my-2 border-t border-gray-100" />

                      <button
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile navigation menu */}
      {showMobileMenu && (
        <div className="lg:hidden border-t border-gray-200">
          <div className="px-2 py-3 space-y-1">
            {/* Add mobile navigation items here if needed */}
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Navigation
            </p>
            {/* Mobile nav items would go here - for now directing to desktop view */}
            <p className="px-3 py-2 text-sm text-gray-600">
              Please use desktop view for full admin functionality
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
