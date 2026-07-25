"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CategoryMenu } from "./CategoryMenu";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative px-1 py-2 text-base font-medium transition-colors duration-[var(--dur-fast)]",
        "after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-[var(--mint)] after:transition-transform after:duration-[var(--dur-base)] after:ease-[var(--ease-out)] hover:after:scale-x-100",
        isActive
          ? "text-[var(--ink)] after:scale-x-100"
          : "text-[var(--ink-70)] hover:text-[var(--ink)]"
      )}
    >
      {label}
    </Link>
  );
}

export function Navigation() {
  return (
    <nav className="flex items-center gap-6">
      <NavLink href="/" label="Home" />
      <NavLink href="/products" label="Shop" />
      <CategoryMenu />
      <NavLink href="/about" label="About" />
      <NavLink href="/contact" label="Contact" />
    </nav>
  );
}
