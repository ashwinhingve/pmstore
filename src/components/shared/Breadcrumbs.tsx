'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-[var(--ink-70)] overflow-x-auto">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-2 whitespace-nowrap">
            {isLast ? (
              <span className="text-[var(--ink)] font-medium">{item.label}</span>
            ) : (
              <>
                <Link
                  href={item.href}
                  className="hover:text-[var(--ink)] transition-colors"
                >
                  {item.label}
                </Link>
                <ChevronRight className="w-4 h-4 text-[var(--ink-40)]" />
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}
