"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Package, ShoppingCart, User } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { MobileMenu } from "./MobileMenu";
import { useCartStore } from "@/store/useCartStore";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/orders", label: "Track order", icon: Package },
] as const;

/**
 * Fixed bottom tab bar for mobile/tablet (`lg:hidden`) — Home, order tracking,
 * cart and profile stay one tap away on every screen, plus a logo button that
 * opens the same MobileMenu drawer Header's hamburger uses, so the full site
 * nav/categories/account list is reachable without a 5th competing tab.
 *
 * Hidden on /admin (SiteChrome renders it, gated the same way as Footer).
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const { status } = useSession();

  useEffect(() => setMounted(true), []);

  const profileHref = mounted && status === "authenticated" ? "/profile" : "/login";
  const itemClass = (active: boolean) =>
    cn(
      "flex min-h-16 flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors duration-[var(--dur-fast)]",
      active ? "text-[var(--brand)]" : "text-[var(--ink-70)] hover:text-[var(--ink)]"
    );

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-lg)] lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className={itemClass(menuOpen)}
        >
          <Logo size={24} variant="mark" />
          <span className="text-[0.6875rem] font-medium leading-none">Menu</span>
        </button>

        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={itemClass(isActive)}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span className="text-[0.6875rem] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/cart"
          aria-current={pathname === "/cart" ? "page" : undefined}
          aria-label={`Cart${mounted && totalItems > 0 ? `, ${totalItems} items` : ""}`}
          className={itemClass(pathname === "/cart")}
        >
          <span className="relative">
            <ShoppingCart className="h-6 w-6" aria-hidden="true" />
            {mounted && totalItems > 0 && (
              <span className="data absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[0.625rem] font-bold text-[var(--brand-ink)]">
                {totalItems}
              </span>
            )}
          </span>
          <span className="text-[0.6875rem] font-medium leading-none">Cart</span>
        </Link>

        <Link
          href={profileHref}
          aria-current={pathname === profileHref ? "page" : undefined}
          className={itemClass(pathname === profileHref)}
        >
          <User className="h-6 w-6" aria-hidden="true" />
          <span className="text-[0.6875rem] font-medium leading-none">Profile</span>
        </Link>
      </nav>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
