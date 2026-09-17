'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Truck,
  Users,
  Package,
  Tags,
  Settings,
  UserCheck,
  TicketPercent,
  BarChart2,
  ClipboardCheck,
  Boxes,
  ClipboardList,
  Inbox,
  FlaskConical,
  Factory,
  Warehouse,
  Building2,
  ShoppingCart,
  PackageSearch,
  SlidersHorizontal,
  RotateCcw,
  ScrollText,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const adminNavigation: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
      { label: 'Custom orders', href: '/admin/custom-orders', icon: ClipboardList },
      { label: 'Bulk orders', href: '/admin/wholesale-enquiries', icon: Boxes },
      { label: 'Enquiries', href: '/admin/enquiries', icon: Inbox },
      { label: 'Prescriptions', href: '/admin/prescriptions', icon: ClipboardCheck },
      { label: 'Payments', href: '/admin/payments', icon: CreditCard },
      { label: 'Shipments', href: '/admin/shipments', icon: Truck },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Categories', href: '/admin/categories', icon: Tags },
      { label: 'Salts', href: '/admin/salts', icon: FlaskConical },
      { label: 'Manufacturers', href: '/admin/manufacturers', icon: Factory },
      { label: 'Offers', href: '/admin/offers', icon: TicketPercent },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Overview', href: '/admin/inventory', icon: Warehouse },
      { label: 'Stock & batches', href: '/admin/inventory/stock', icon: PackageSearch },
      { label: 'Reorder list', href: '/admin/inventory/reorder', icon: ListChecks },
      { label: 'Purchases', href: '/admin/inventory/purchases', icon: ShoppingCart },
      { label: 'Suppliers', href: '/admin/inventory/suppliers', icon: Building2 },
      { label: 'Adjustments', href: '/admin/inventory/adjustments', icon: SlidersHorizontal },
      { label: 'Purchase returns', href: '/admin/inventory/returns', icon: RotateCcw },
      { label: 'Stock history', href: '/admin/inventory/history', icon: ScrollText },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Team', href: '/admin/team', icon: UserCheck },
    ],
  },
  {
    title: 'Site',
    items: [
      { label: 'Site settings', href: '/admin/settings', icon: Settings },
      { label: 'Marketing', href: '/admin/marketing', icon: BarChart2 },
    ],
  },
];

// The single active item is the one whose href is the longest match for the
// current path, so a section index (e.g. /admin/inventory) doesn't stay lit on
// its own children (/admin/inventory/stock) alongside the child.
function activeHrefFor(pathname: string): string {
  let best = '';
  for (const group of adminNavigation) {
    for (const item of group.items) {
      if ((pathname === item.href || pathname.startsWith(item.href + '/')) && item.href.length > best.length) {
        best = item.href;
      }
    }
  }
  return best;
}

export function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeHref = activeHrefFor(pathname);

  return (
    <nav className="flex-1 space-y-5 px-3" aria-label="Admin">
      {adminNavigation.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ink-40)]">
            {group.title}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === activeHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex min-h-10 items-center rounded-[var(--radius-sm)] border-l-4 px-3 py-2 text-sm font-medium transition-colors duration-[var(--dur-fast)]',
                    isActive
                      ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--ink)]'
                      : 'border-transparent text-[var(--ink-70)] hover:bg-[var(--foil-soft)] hover:text-[var(--ink)]'
                  )}
                >
                  <Icon
                    className={cn(
                      'mr-3 h-5 w-5 shrink-0 transition-colors duration-[var(--dur-fast)]',
                      isActive
                        ? 'text-[var(--brand)]'
                        : 'text-[var(--ink-40)] group-hover:text-[var(--ink-70)]'
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminSidebar() {
  return (
    <aside className="hidden lg:flex lg:shrink-0">
      <div className="flex w-64 flex-col">
        <div className="flex grow flex-col overflow-y-auto border-r border-[var(--foil-soft)] bg-[var(--paper-card)] pb-4 pt-5">
          {/* Brand */}
          <div className="mb-6 flex shrink-0 items-center px-6">
            <div>
              <h2 className="text-xl font-bold text-[var(--ink)]">Admin panel</h2>
              <p className="text-sm text-[var(--ink-40)]">PM Store</p>
            </div>
          </div>

          <AdminNavLinks />

          {/* Footer */}
          <div className="border-t border-[var(--foil-soft)] px-6 py-4">
            <p className="text-xs text-[var(--ink-40)]">
              Admin access only. All actions are logged.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
