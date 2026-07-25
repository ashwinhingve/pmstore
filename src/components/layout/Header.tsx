"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Navigation } from "./Navigation";
import { TopBar } from "./TopBar";
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

  return (
    <>
      {/* Utility bar — scrolls away, keeps the sticky header at a clean 72px */}
      <TopBar />

      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b bg-[var(--paper)]/80 backdrop-blur-md transition-[box-shadow,border-color,background-color] duration-[var(--dur-base)]",
          scrolled
            ? "border-[var(--foil-soft)] shadow-[var(--shadow-sm)]"
            : "border-transparent"
        )}
      >
        <div className="mx-auto flex h-18 max-w-[1200px] items-center gap-4 px-4 sm:px-6 lg:px-8">
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
        <div className="ml-auto flex items-center gap-1 md:gap-2">
          {/* Search — primary navigation (docs/03-DESIGN-SYSTEM.md) */}
          <div className="hidden w-56 md:block lg:w-80">
            <SearchBar />
          </div>

          {/* User Account */}
          {mounted && status === 'authenticated' && session?.user ? (
            <DropdownMenu
              trigger={
                session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )
              }
              header={
                <div>
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
              }
              items={[
                ...(session.user.role === 'admin' ? [
                  {
                    label: 'Admin dashboard',
                    href: '/admin/dashboard',
                    icon: <LayoutDashboard className="h-4 w-4" />,
                  },
                ] : []),
                {
                  label: 'Your orders',
                  href: '/orders',
                  icon: <Package className="h-4 w-4" />,
                },
                {
                  label: 'Saved medicines',
                  href: '/saved',
                  icon: <Bookmark className="h-4 w-4" />,
                },
                {
                  label: 'Profile',
                  href: '/profile',
                  icon: <User className="h-4 w-4" />,
                },
                {
                  label: 'Sign out',
                  onClick: () => signOut({ callbackUrl: '/' }),
                  icon: <LogOut className="h-4 w-4" />,
                },
              ]}
              align="right"
              className="transition-colors hover:bg-[var(--mint-soft)] hover:text-[var(--mint)]"
            />
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
    </>
  );
}
