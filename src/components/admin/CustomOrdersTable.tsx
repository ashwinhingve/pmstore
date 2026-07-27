'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  Phone,
  Mail,
  Pill,
  FileText,
} from 'lucide-react';
import { Badge, statusBadgeVariant } from '@/components/ui/badge';
import { formatDate as formatDateIST } from '@/lib/utils/format-date';

interface Order {
  id: string;
  name: string;
  phone: string;
  email: string;
  medicines: string;
  quantity: string;
  deliveryArea: string;
  hasPrescription: boolean;
  notes: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt: string;
}

interface Props {
  orders: Order[];
  counts: Record<string, number>;
  total: number;
  currentPage: number;
  totalPages: number;
  filters: { status: string; search: string };
}

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'closed', label: 'Closed' },
];

const mono = { fontFamily: 'var(--font-data)' as const, fontVariantNumeric: 'tabular-nums' as const };

function formatDate(iso: string): string {
  if (!iso) return '—';
  return formatDateIST(iso);
}

export default function CustomOrdersTable({
  orders,
  counts,
  total,
  currentPage,
  totalPages,
  filters,
}: Props) {
  const router = useRouter();
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildUrl = (next: { status?: string; search?: string; page?: number }) => {
    const params = new URLSearchParams();
    const status = next.status ?? filters.status;
    const search = next.search ?? filters.search;
    const page = next.page ?? 1;
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return `/admin/custom-orders${qs ? `?${qs}` : ''}`;
  };

  const go = (next: { status?: string; search?: string; page?: number }) => {
    startTransition(() => router.push(buildUrl(next)));
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    go({ search: localSearch, page: 1 });
  };

  const changeStatus = async (id: string, status: Order['status']) => {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/custom-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message || 'Could not update the status. Try again.');
        return;
      }
      router.refresh();
    } catch {
      setError('Connection error. Check your network and try again.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const active = filters.status === tab.value;
          const count = tab.value ? counts[tab.value] ?? 0 : total;
          return (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => go({ status: tab.value, page: 1 })}
              aria-pressed={active}
              className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-4 py-2 text-sm font-medium transition-colors duration-[var(--dur-fast)] ${
                active
                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper-card)]'
                  : 'border-[var(--foil-soft)] bg-[var(--paper-card)] text-[var(--ink-70)] hover:border-[var(--brand)] hover:text-[var(--ink)]'
              }`}
            >
              {tab.label}
              <span style={mono} className={active ? 'text-[var(--paper-card)]' : 'text-[var(--ink-40)]'}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-40)]" aria-hidden="true" />
          <label htmlFor="custom-order-search" className="sr-only">
            Search custom orders by name, phone, email or medicine
          </label>
          <input
            id="custom-order-search"
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search name, phone, email or medicine"
            className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] pl-10 pr-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]"
          />
        </div>
        <button
          type="submit"
          className="h-11 rounded-[var(--radius-sm)] bg-[var(--ink)] px-5 text-sm font-semibold text-[var(--paper-card)] transition-opacity duration-[var(--dur-fast)] hover:opacity-90"
        >
          Search
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-4 py-3 text-sm text-[var(--ink)]">
          {error}
        </p>
      )}

      {/* Order list */}
      {orders.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-10 text-center">
          <Pill className="mx-auto mb-3 h-8 w-8 text-[var(--ink-40)]" aria-hidden="true" />
          <p className="font-semibold text-[var(--ink)]">No custom orders here yet</p>
          <p className="mt-1 text-sm text-[var(--ink-70)]">
            {filters.search || filters.status
              ? 'Nothing matches these filters. Clear them to see everything.'
              : 'Medicine requests from the storefront will appear here.'}
          </p>
        </div>
      ) : (
        <ul className={`space-y-3 ${pending ? 'opacity-60' : ''}`}>
          {orders.map((o) => {
            const isOpen = expanded === o.id;
            return (
              <li
                key={o.id}
                className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--foil-soft)] bg-[var(--paper-card)] shadow-[var(--shadow-sm)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : o.id)}
                    aria-expanded={isOpen}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--brand-soft)]">
                      <User className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[var(--ink)]">{o.name}</span>
                      <span className="block truncate text-sm text-[var(--ink-70)]">{o.medicines}</span>
                    </span>
                    <ChevronDown
                      className={`ml-auto mt-1 h-4 w-4 shrink-0 text-[var(--ink-40)] transition-transform duration-[var(--dur-fast)] ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>

                  <div className="flex items-center gap-3">
                    {o.hasPrescription && (
                      <span className="hidden rounded-[var(--radius-pill)] bg-[var(--rx-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--rx)] sm:inline">
                        Has Rx
                      </span>
                    )}
                    <span style={mono} className="hidden text-xs text-[var(--ink-40)] sm:inline">
                      {formatDate(o.createdAt)}
                    </span>
                    <Badge variant={statusBadgeVariant(o.status)}>
                      {o.status}
                    </Badge>
                    <label className="sr-only" htmlFor={`status-${o.id}`}>
                      Update status for {o.name}
                    </label>
                    <select
                      id={`status-${o.id}`}
                      value={o.status}
                      disabled={savingId === o.id}
                      onChange={(ev) => changeStatus(o.id, ev.target.value as Order['status'])}
                      className="h-9 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)] disabled:opacity-60"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-[var(--foil-soft)] bg-[var(--paper-tint)] px-4 py-4">
                    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                      <Field label="Phone">
                        <a href={`tel:${o.phone}`} style={mono} className="text-[var(--ink)] hover:underline">
                          <Phone className="mr-1 inline h-3.5 w-3.5 text-[var(--ink-40)]" aria-hidden="true" />
                          {o.phone || '—'}
                        </a>
                      </Field>
                      {o.email && (
                        <Field label="Email">
                          <a href={`mailto:${o.email}`} className="break-all text-[var(--ink)] hover:underline">
                            <Mail className="mr-1 inline h-3.5 w-3.5 text-[var(--ink-40)]" aria-hidden="true" />
                            {o.email}
                          </a>
                        </Field>
                      )}
                      {o.deliveryArea && <Field label="Delivery area">{o.deliveryArea}</Field>}
                      {o.quantity && <Field label="Quantity">{o.quantity}</Field>}
                      <Field label="Prescription">{o.hasPrescription ? 'Customer has one' : 'Not indicated'}</Field>
                      <div className="sm:col-span-2">
                        <Field label="Medicines requested">
                          <span className="flex items-start gap-1.5">
                            <Pill className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink-40)]" aria-hidden="true" />
                            <span className="whitespace-pre-wrap">{o.medicines}</span>
                          </span>
                        </Field>
                      </div>
                      {o.notes && (
                        <div className="sm:col-span-2">
                          <Field label="Notes">
                            <span className="flex items-start gap-1.5">
                              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--ink-40)]" aria-hidden="true" />
                              <span className="whitespace-pre-wrap">{o.notes}</span>
                            </span>
                          </Field>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => go({ page: currentPage - 1 })}
            className="inline-flex h-10 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-4 text-sm font-medium text-[var(--ink-70)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
          </button>
          <p className="text-sm text-[var(--ink-70)]">
            Page <span style={mono}>{currentPage}</span> of <span style={mono}>{totalPages}</span>
          </p>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => go({ page: currentPage + 1 })}
            className="inline-flex h-10 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--foil-soft)] bg-[var(--paper-card)] px-4 text-sm font-medium text-[var(--ink-70)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-40)]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[var(--ink-70)]">{children}</dd>
    </div>
  );
}
