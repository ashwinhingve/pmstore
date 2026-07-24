"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Navigation } from "./Navigation";
import { MobileMenu } from "./MobileMenu";
import { SearchBar } from "@/components/search/SearchBar";
import { Logo } from "@/components/shared/Logo";
import { useCartStore } from "@/store/useCartStore";
import { cn } from "@/lib/utils";
import {
  User,
  ShoppingCart,
  Menu,
  LogOut,
  LayoutDashboard,
  Package,
  Bookmark,
} from "lucide-react";
import { SITE_NAME } from "@/lib/constants";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Elevation appears only once content scrolls under the bar.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  const menuLinkClass =
    "flex min-h-11 items-center gap-3 px-4 text-sm text-[var(--ink-70)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--mint-soft)] hover:text-[var(--ink)]";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-[var(--foil-soft)] bg-[var(--paper)]/90 backdrop-blur transition-shadow duration-[var(--dur-fast)]",
        scrolled && "shadow-[var(--shadow-sm)]"
      )}
    >
      <div className="mx-auto flex h-18 max-w-[1200px] items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo and Brand */}
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity duration-[var(--dur-fast)] hover:opacity-80"
          aria-label={`${SITE_NAME} - Home`}
        >
          <div className="shrink-0 text-[var(--ink)]">
            <Logo size={44} variant="mark" />
          </div>
          <div className="hidden flex-col sm:flex lg:hidden xl:flex">
            <span className="text-lg font-bold leading-tight text-[var(--ink)] md:text-xl">
              {SITE_NAME}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:items-center" aria-label="Main navigation">
          <Navigation />
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Search — primary navigation (docs/03-DESIGN-SYSTEM.md) */}
          <div className="hidden w-56 md:block lg:w-72">
            <SearchBar />
          </div>

          {/* User Account */}
          {mounted && status === 'authenticated' && session?.user ? (
            <div className="user-menu-container relative">
              <Button
                variant="ghost"
                size="icon"
                className="transition-colors hover:bg-[var(--mint-soft)] hover:text-[var(--mint)]"
                aria-label="User account"
                aria-expanded={showUserMenu}
                aria-haspopup="menu"
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
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-md)]">
                  <div className="border-b border-[var(--foil-soft)] bg-[var(--mint-soft)] px-4 py-3">
                    <p className="truncate text-sm font-semibold text-[var(--ink)]">
                      {session.user.name || 'User'}
                    </p>
                    <p className="truncate text-xs text-[var(--ink-70)]">
                      {session.user.email}
                    </p>
                    {session.user.role === 'admin' && (
                      <span className="mt-1.5 inline-block rounded-full bg-[var(--ink)] px-2 py-0.5 text-xs font-semibold text-[var(--paper-card)]">
                        Admin
                      </span>
                    )}
                  </div>

                  <div className="py-2">
                    {session.user.role === 'admin' && (
                      <Link
                        href="/admin/dashboard"
                        className={menuLinkClass}
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                        Admin dashboard
                      </Link>
                    )}
                    <Link
                      href="/orders"
                      className={menuLinkClass}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Package className="h-4 w-4" aria-hidden="true" />
                      Your orders
                    </Link>
                    <Link
                      href="/saved"
                      className={menuLinkClass}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Bookmark className="h-4 w-4" aria-hidden="true" />
                      Saved medicines
                    </Link>
                    <Link
                      href="/profile"
                      className={menuLinkClass}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                      Profile
                    </Link>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut({ callbackUrl: '/' });
                      }}
                      className={cn(menuLinkClass, "w-full hover:bg-[var(--foil-soft)]")}
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Sign out
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
                className="transition-colors hover:bg-[var(--mint-soft)] hover:text-[var(--mint)]"
                aria-label="Sign in"
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
                className="hidden transition-colors hover:bg-[var(--mint-soft)] hover:text-[var(--mint)] sm:flex"
                aria-label="Your orders"
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
              className="relative transition-colors hover:bg-[var(--mint-soft)] hover:text-[var(--mint)]"
              aria-label={`Shopping cart${mounted && totalItems > 0 ? ` with ${totalItems} items` : ''}`}
            >
              <ShoppingCart className="h-5 w-5" />
              {mounted && totalItems > 0 && (
                <span className="data absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ink)] text-xs font-bold text-[var(--paper-card)] shadow-[var(--shadow-xs)]">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="transition-colors hover:bg-[var(--mint-soft)] hover:text-[var(--mint)] lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Mobile search — full width under the bar; search is the primary action */}
      <div className="border-t border-[var(--foil-soft)] px-4 py-2 md:hidden">
        <SearchBar />
      </div>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </header>
  );
}
