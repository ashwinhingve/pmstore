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
import { SITE_SHORT_NAME } from "@/lib/constants";

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
          "sticky top-0 z-50 w-full border-b bg-[image:var(--surface-brand)] transition-[box-shadow,border-color] duration-[var(--dur-base)]",
          scrolled
            ? "border-[var(--brand-deep)] shadow-[var(--shadow-md)]"
            : "border-transparent"
        )}
      >
        <div className="mx-auto flex h-18 max-w-[1600px] xl:w-4/5 items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo and Brand */}
        <Link
          href="/"
          className="group flex items-center gap-3 transition-opacity duration-[var(--dur-fast)] hover:opacity-80"
          aria-label={`${SITE_SHORT_NAME} - Home`}
        >
          <div className="shrink-0 text-[var(--brand-ink)]">
            <Logo size={44} variant="mark" />
          </div>
          <span className="hidden font-[family-name:var(--font-display)] text-lg leading-tight tracking-tight text-[var(--brand-ink)] sm:inline md:text-xl lg:hidden xl:inline">
            {(() => {
              const [first, ...rest] = SITE_SHORT_NAME.split(" ");
              return (
                <>
                  <span className="font-extrabold">{first}</span>
                  {rest.length > 0 && <span className="font-medium text-[var(--brand-ink)]/80"> {rest.join(" ")}</span>}
                </>
              );
            })()}
          </span>
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

          {/* Admin dashboard — only for admins (role read from the DB session) */}
          {mounted && status === 'authenticated' && session?.user?.role === 'admin' && (
            <Link href="/admin/dashboard" className="hidden sm:inline-flex">
              <Button
                size="sm"
                className="gap-1.5 bg-[var(--brand-ink)] text-[var(--brand-deep)] hover:bg-[var(--brand-ink)]/90"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Admin
              </Button>
            </Link>
          )}

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
              className="text-[var(--brand-ink)] transition-colors hover:bg-[var(--brand-ink)]/15 hover:text-[var(--brand-ink)]"
            />
          ) : (
            <Link href="/login">
              <Button
                variant="ghost"
                size="icon"
                className="text-[var(--brand-ink)] transition-colors hover:bg-[var(--brand-ink)]/15 hover:text-[var(--brand-ink)]"
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
                className="hidden text-[var(--brand-ink)] transition-colors hover:bg-[var(--brand-ink)]/15 hover:text-[var(--brand-ink)] sm:flex"
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
              className="relative text-[var(--brand-ink)] transition-colors hover:bg-[var(--brand-ink)]/15 hover:text-[var(--brand-ink)]"
              aria-label={`Shopping cart${mounted && totalItems > 0 ? ` with ${totalItems} items` : ''}`}
            >
              <ShoppingCart className="h-5 w-5" />
              {mounted && totalItems > 0 && (
                <span className="data absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-ink)] text-xs font-bold text-[var(--brand-deep)] shadow-[var(--shadow-xs)]">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-[var(--brand-ink)] transition-colors hover:bg-[var(--brand-ink)]/15 hover:text-[var(--brand-ink)] lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Mobile search — full width under the bar; search is the primary action */}
      <div className="border-t border-[var(--brand-ink)]/15 px-4 pb-3 pt-2 md:hidden">
        <SearchBar />
      </div>

        {/* Mobile Menu */}
        <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      </header>
    </>
  );
}
