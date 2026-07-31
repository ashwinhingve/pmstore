"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Categories used to live here as a dropdown. They now surface as image cards on
// the landing page (src/components/landing/Categories.tsx) and in the mobile
// menu's "Shop by category" section, so the top nav stays lean. CategoryMenu.tsx
// is kept in the repo, just no longer rendered.
function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative whitespace-nowrap px-1 py-2.5 text-base font-semibold tracking-tight transition-colors duration-[var(--dur-fast)]",
        "after:absolute after:inset-x-1 after:bottom-1 after:h-[3px] after:origin-left after:scale-x-0 after:rounded-full after:bg-[var(--brand-ink)] after:transition-transform after:duration-[var(--dur-base)] after:ease-[var(--ease-out)] hover:after:scale-x-100",
        isActive
          ? "text-[var(--brand-ink)] after:scale-x-100"
          : "text-[var(--brand-ink)]/85 hover:text-[var(--brand-ink)]"
      )}
    >
      {label}
    </Link>
  );
}

export function Navigation() {
  return (
    <nav className="flex items-center gap-7">
      <NavLink href="/" label="Home" />
      <NavLink href="/products" label="Shop" />
      <NavLink href="/custom-order" label="Custom order" />
      <NavLink href="/about" label="About" />
      <NavLink href="/contact" label="Contact" />
    </nav>
  );
}
