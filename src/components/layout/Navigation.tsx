"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-6">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative px-1 py-2 text-base font-medium transition-colors duration-[var(--dur-fast)]",
              "after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-[var(--mint)] after:transition-transform after:duration-[var(--dur-base)] after:ease-[var(--ease-out)] hover:after:scale-x-100",
              isActive
                ? "text-[var(--ink)] after:scale-x-100"
                : "text-[var(--ink-70)] hover:text-[var(--ink)]"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
