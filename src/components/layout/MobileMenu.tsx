"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { FileUp, Home, Info, Package, Phone, Pill, Bookmark, User, LayoutDashboard, Boxes } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { PHARMA_CATEGORIES } from "@/lib/categories";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/products", label: "Shop", icon: Pill },
  { href: "/wholesale", label: "Bulk order", icon: Boxes },
  { href: "/orders", label: "Your orders", icon: Package },
  { href: "/saved", label: "Saved medicines", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/about", label: "About", icon: Info },
  { href: "/contact", label: "Contact", icon: Phone },
];

// Canonical pharma categories — mirrors the desktop CategoryMenu / landing
// Categories. Names match the DB so each link filters /products correctly.
const CATEGORIES = PHARMA_CATEGORIES.map((c) => c.name);

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAdmin = status === "authenticated" && session?.user?.role === "admin";

  return (
    <Drawer open={isOpen} onClose={onClose} title="Menu" side="right" className="lg:hidden">
      <nav aria-label="Mobile navigation" className="flex h-full flex-col p-4">
        <div className="flex-1 overflow-y-auto">
          {isAdmin && (
            <Link
              href="/admin/dashboard"
              onClick={onClose}
              className="mb-3 flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--ink)] px-3 font-semibold text-[var(--paper-card)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--ink-deep)]"
            >
              <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              Admin dashboard
            </Link>
          )}
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-base font-medium transition-colors duration-[var(--dur-fast)]",
                      isActive
                        ? "bg-[var(--mint-soft)] text-[var(--ink)]"
                        : "text-[var(--ink-70)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]"
                    )}
                  >
                    <Icon
                      className={cn("h-5 w-5", isActive ? "text-[var(--mint)]" : "text-[var(--ink-40)]")}
                      aria-hidden="true"
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6">
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wide text-[var(--ink-40)]">
              Shop by category
            </h3>
            <div className="mt-2 flex flex-wrap gap-2 px-1">
              {CATEGORIES.map((name) => (
                <Link
                  key={name}
                  href={`/products?category=${encodeURIComponent(name)}`}
                  onClick={onClose}
                  className="rounded-[var(--radius-pill)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-3 py-1.5 text-sm font-medium text-[var(--ink-70)] transition-colors duration-[var(--dur-fast)] hover:border-[var(--mint)] hover:text-[var(--ink)]"
                >
                  {name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <Link
          href="/prescriptions"
          onClick={onClose}
          className="mt-4 flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--ink)] px-4 font-medium text-[var(--paper-card)] shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--ink-deep)]"
        >
          <FileUp className="h-5 w-5" aria-hidden="true" />
          Upload prescription
        </Link>
      </nav>
    </Drawer>
  );
}
