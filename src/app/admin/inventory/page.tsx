'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, Money, errorMessage } from '@/components/admin/inventory/shared';
import { toast } from '@/store/useToastStore';
import {
  PackageSearch, ShoppingCart, SlidersHorizontal, RotateCcw, Building2, ScrollText, ListChecks,
} from 'lucide-react';

interface Overview {
  stockValueAtCost: number;
  stockValueAtMrp: number;
  unitsInStock: number;
  liveBatches: number;
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  expiringSoon: number;
  expired: number;
}

const QUICK_LINKS = [
  { label: 'Stock & batches', href: '/admin/inventory/stock', icon: PackageSearch, desc: 'See stock, batches and expiry' },
  { label: 'Reorder list', href: '/admin/inventory/reorder', icon: ListChecks, desc: 'What to buy next, and from whom' },
  { label: 'New purchase', href: '/admin/inventory/purchases/new', icon: ShoppingCart, desc: 'Receive stock from a supplier' },
  { label: 'Adjust stock', href: '/admin/inventory/adjustments', icon: SlidersHorizontal, desc: 'Counter sale, wastage, recount' },
  { label: 'Purchase return', href: '/admin/inventory/returns', icon: RotateCcw, desc: 'Send stock back to a supplier' },
  { label: 'Suppliers', href: '/admin/inventory/suppliers', icon: Building2, desc: 'Distributors you buy from' },
  { label: 'Stock history', href: '/admin/inventory/history', icon: ScrollText, desc: 'Every stock movement' },
];

export default function InventoryOverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/inventory/overview');
        const body = await res.json();
        if (res.ok) setData(body.data);
        else toast.error(errorMessage(body, "Couldn't load the inventory overview."));
      } catch {
        toast.error("Couldn't load the inventory overview. Check your connection.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inventory"
        description="Stock value, batches and what needs attention across the catalogue."
      />

      {/* Valuation */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-[var(--ink-70)]">Stock value at cost</p>
          <p className="mt-1 text-[length:var(--step-2)] font-bold text-[var(--ink)]">
            {loading ? '—' : <Money value={data?.stockValueAtCost} />}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-40)]">
            {loading ? '' : `${data?.unitsInStock ?? 0} units across ${data?.liveBatches ?? 0} live batches`}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[var(--ink-70)]">Stock value at MRP</p>
          <p className="mt-1 text-[length:var(--step-2)] font-bold text-[var(--ink)]">
            {loading ? '—' : <Money value={data?.stockValueAtMrp} />}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-40)]">Retail value of stock on hand</p>
        </Card>
      </div>

      {/* Attention counts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Products" value={data?.totalProducts} loading={loading} href="/admin/inventory/stock" />
        <StatCard label="Low stock" value={data?.lowStock} loading={loading} href="/admin/inventory/stock?filter=low" tint="amber" />
        <StatCard label="Out of stock" value={data?.outOfStock} loading={loading} href="/admin/inventory/stock?filter=out" tint="neutral" />
        <StatCard label="Expiring soon" value={data?.expiringSoon} loading={loading} href="/admin/inventory/stock?filter=expiring" tint="amber" />
        <StatCard label="Expired" value={data?.expired} loading={loading} href="/admin/inventory/stock?filter=expired" tint="neutral" />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--brand)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-soft)] text-[var(--brand-deep)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-medium text-[var(--ink)]">{link.label}</span>
                  <span className="block text-sm text-[var(--ink-70)]">{link.desc}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, loading, href, tint,
}: {
  label: string;
  value?: number;
  loading: boolean;
  href: string;
  tint?: 'amber' | 'neutral';
}) {
  const color =
    tint === 'amber' && value ? 'var(--tint-amber)' : 'var(--ink)';
  return (
    <Link
      href={href}
      className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-4 shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--brand)]"
    >
      <p className="text-sm text-[var(--ink-70)]">{label}</p>
      <p className="mt-1 text-[length:var(--step-2)] font-bold tabular-nums" style={{ fontFamily: 'var(--font-data)', color }}>
        {loading ? '—' : value ?? 0}
      </p>
    </Link>
  );
}
