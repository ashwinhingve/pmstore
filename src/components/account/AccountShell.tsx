'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, Package, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const accountNav = [
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/saved', label: 'Saved medicines', icon: Bookmark },
  { href: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Shared chrome for the signed-in account area: page title plus a nav that
 * renders as a sidebar on desktop and horizontal pills on mobile.
 */
export function AccountShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-[length:var(--step-2)] text-[var(--ink)]">{title}</h1>
        {description && <p className="mt-1 text-[var(--ink-70)]">{description}</p>}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <nav aria-label="Account" className="shrink-0 lg:w-56">
          <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-col lg:gap-1 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            {accountNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 whitespace-nowrap rounded-[var(--radius-sm)] px-3 text-sm font-medium transition-colors duration-[var(--dur-fast)]',
                      isActive
                        ? 'bg-[var(--mint-soft)] text-[var(--ink)]'
                        : 'text-[var(--ink-70)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]'
                    )}
                  >
                    <Icon
                      className={cn('h-4 w-4', isActive ? 'text-[var(--mint)]' : 'text-[var(--ink-40)]')}
                      aria-hidden="true"
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
