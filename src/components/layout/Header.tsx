"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Navigation } from "./Navigation";
import { MobileMenu } from "./MobileMenu";
import { useCartStore } from "@/store/useCartStore";
import { Search, User, ShoppingCart, Menu, X, LogOut, LayoutDashboard, Package } from "lucide-react";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        {/* Logo and Brand */}
        <Link
          href="/"
          className="flex items-center space-x-3 group transition-opacity hover:opacity-80"
          aria-label="PMStore - Home"
        >
          <div className="relative h-12 w-12 md:h-16 md:w-16 shrink-0">
            <Image
              src="/images/logo.jpg"
              alt="PMStore Logo"
              fill
              className="object-contain rounded-full"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-lg md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-amber-600 to-red-700 bg-clip-text text-transparent leading-tight">
              PMStore Food &amp; Spices
            </span>
            <span className="text-xs md:text-sm font-semibold text-muted-foreground hidden lg:pl-6 sm:block">
              शुद्धता का वादा - The Taste of Purity
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex lg:items-center" aria-label="Main navigation">
          <Navigation />
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Search Icon */}
          {/* <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex hover:bg-amber-50 hover:text-amber-700 transition-colors"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button> */}

          {/* User Account */}
          {mounted && status === 'authenticated' && session?.user ? (
            <div className="relative user-menu-container">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-amber-50 hover:text-amber-700 transition-colors"
                aria-label="User account"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </Button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                  <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-red-50 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {session.user.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {session.user.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ID: {session.user.id}
                    </p>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full ${
                      session.user.role === 'admin'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {session.user.role === 'admin' ? 'Admin' : 'Customer'}
                    </span>
                  </div>

                  <div className="py-2">
                    {session.user.role === 'admin' && (
                      <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    )}
                    <Link
                      href="/orders"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      My Orders
                    </Link>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut({ callbackUrl: '/' });
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-amber-50 hover:text-amber-700 transition-colors"
                aria-label="User account"
              >
                <User className="h-5 w-5" />
              </Button>
            </Link>
          )}

          {/* My Orders - visible when logged in */}
          {mounted && status === 'authenticated' && (
            <Link href="/orders">
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex hover:bg-amber-50 hover:text-amber-700 transition-colors"
                aria-label="My Orders"
              >
                <Package className="h-5 w-5" />
              </Button>
            </Link>
          )}

          {/* Shopping Cart */}
          <Link href="/cart">
            <Button
              variant="ghost"
              size="icon"
              className="relative hover:bg-amber-50 hover:text-amber-700 transition-colors"
              aria-label={`Shopping cart${mounted && totalItems > 0 ? ` with ${totalItems} items` : ''}`}
            >
              <ShoppingCart className="h-5 w-5" />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-amber-600 to-red-700 text-xs text-white flex items-center justify-center font-bold shadow-md">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-amber-50 hover:text-amber-700 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </header>
  );
}
