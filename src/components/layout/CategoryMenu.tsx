"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PHARMA_CATEGORIES } from "@/lib/categories";

// Canonical pharma categories — names match the DB so each link filters
// /products correctly. See src/lib/categories.ts.
const CATEGORIES = PHARMA_CATEGORIES;

/**
 * Desktop "Shop by category" dropdown. Opens on hover for mouse users and on
 * click/keyboard for everyone else; closes on Escape, blur, and outside click.
 */
export function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const openNow = () => {
    clearTimer();
    setOpen(true);
  };
  const closeSoon = () => {
    clearTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  useEffect(() => () => clearTimer(), []);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex items-center gap-1 px-1 py-2 text-base font-medium transition-colors duration-[var(--dur-fast)]",
          open ? "text-[var(--ink)]" : "text-[var(--ink-70)] hover:text-[var(--ink)]"
        )}
      >
        Categories
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-[var(--dur-fast)]",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-2 w-[30rem] -translate-x-1/2 rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-3 shadow-[var(--shadow-lg)]"
        >
          <div className="grid grid-cols-2 gap-1">
            {CATEGORIES.map(({ name, icon: Icon }) => (
              <Link
                key={name}
                role="menuitem"
                href={`/products?category=${encodeURIComponent(name)}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-[var(--radius-sm)] p-2.5 text-sm font-medium text-[var(--ink-70)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--mint-soft)] hover:text-[var(--ink)]"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--mint-soft)] text-[var(--mint)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {name}
              </Link>
            ))}
          </div>
          <Link
            href="/products"
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center justify-center gap-1.5 border-t border-[var(--foil-soft)] pt-3 text-sm font-semibold text-[var(--mint)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--mint-deep)]"
          >
            View all medicines
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
