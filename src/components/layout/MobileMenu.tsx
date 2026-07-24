"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileUp, Home, Info, Package, Phone, Pill, Bookmark, User } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/products", label: "Shop", icon: Pill },
  { href: "/orders", label: "Your orders", icon: Package },
  { href: "/saved", label: "Saved medicines", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/about", label: "About", icon: Info },
  { href: "/contact", label: "Contact", icon: Phone },
];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();

  return (
    <Drawer open={isOpen} onClose={onClose} title="Menu" side="right" className="lg:hidden">
      <nav aria-label="Mobile navigation" className="flex h-full flex-col justify-between p-4">
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

        <Link
          href="/prescriptions"
          onClick={onClose}
          className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--ink)] px-4 font-medium text-[var(--paper-card)] shadow-[var(--shadow-xs)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--ink-deep)]"
        >
          <FileUp className="h-5 w-5" aria-hidden="true" />
          Upload prescription
        </Link>
      </nav>
    </Drawer>
  );
}
