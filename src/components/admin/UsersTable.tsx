'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/format-date';
import { Drawer } from '@/components/ui/drawer';
import { toast } from '@/store/useToastStore';

interface UserDetail {
  _id: string;
  name?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  emailVerified?: boolean | string | null;
  mobileVerified?: boolean;
  createdAt?: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
  lastLogin: string | null;
}

interface Filters {
  search: string;
  role: string;
  sortBy: string;
}

interface UsersTableProps {
  users: UserData[];
  totalPages: number;
  currentPage: number;
  filters: Filters;
}

export default function UsersTable({
  users,
  totalPages,
  currentPage,
  filters,
}: UsersTableProps) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localFilters, setLocalFilters] = useState(filters);

  // User-detail drawer (the "View" action)
  const [viewUser, setViewUser] = useState<UserData | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  const openUser = async (user: UserData) => {
    setViewUser(user);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      if (!res.ok) throw new Error('load failed');
      const json = await res.json();
      setDetail(json.data as UserDetail);
    } catch {
      toast.error("Couldn't load this user. Try again.");
    } finally {
      setDetailLoading(false);
    }
  };

  const changeRole = async (nextRole: string) => {
    if (!viewUser || nextRole === viewUser.role) return;
    setSavingRole(true);
    try {
      const res = await fetch(`/api/admin/users/${viewUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message || 'Update failed');
      setViewUser({ ...viewUser, role: nextRole });
      setDetail((d) => (d ? { ...d, role: nextRole } : d));
      toast.success(`Role changed to ${nextRole}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update the role.");
    } finally {
      setSavingRole(false);
    }
  };

  const updateURL = (newFilters: Partial<Filters>, page = 1) => {
    const params = new URLSearchParams();

    if (page > 1) params.set('page', page.toString());
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.role) params.set('role', newFilters.role);
    if (newFilters.sortBy) params.set('sortBy', newFilters.sortBy);

    router.push(`/admin/users?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateURL({ ...localFilters, search: localSearch });
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const applyFilters = () => {
    updateURL(localFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    const resetFilters = {
      search: '',
      role: '',
      sortBy: 'createdAt',
    };
    setLocalFilters(resetFilters);
    setLocalSearch('');
    updateURL(resetFilters);
    setShowFilters(false);
  };

  const hasActiveFilters = filters.role || filters.search || filters.sortBy !== 'createdAt';

  return (
    <div className="rounded-lg bg-[var(--paper-card)] shadow-[var(--shadow-sm)] border border-[var(--foil-soft)]">
      {/* Search and Filter Bar */}
      <div className="p-4 border-b border-[var(--foil-soft)] space-y-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--ink-40)]" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)] focus:border-transparent"
              />
            </div>
          </form>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'bg-[var(--foil-soft)] border-[var(--ink)] text-[var(--ink)]'
                : 'bg-[var(--paper-card)] border-[var(--foil-soft)] text-[var(--ink)] hover:bg-[var(--foil-soft)]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-[var(--ink)] text-[var(--paper-card)] text-xs rounded-full px-2 py-0.5">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-[var(--foil-soft)] rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                  User role
                </label>
                <select
                  value={localFilters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                >
                  <option value="">All roles</option>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Sort by
                </label>
                <select
                  value={localFilters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)]"
                >
                  <option value="createdAt">Recent signups</option>
                  <option value="orders">Most orders</option>
                  <option value="spent">Highest spending</option>
                </select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-[var(--ink)] hover:text-[var(--ink-70)]"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-2 bg-[var(--ink)] text-[var(--paper-card)] text-sm font-medium rounded-lg hover:opacity-90"
              >
                Apply filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 border-b border-[var(--foil)] bg-[var(--paper-tint)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Orders
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Total spent
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--ink-70)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--foil-soft)]">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[var(--ink-40)]">
                  No users yet. Registered customers appear here.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-[var(--foil-soft)]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[var(--ink)] flex items-center justify-center text-[var(--paper-card)] font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-[var(--ink)]">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--ink)]">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin'
                          ? 'bg-[var(--foil-soft)] text-[var(--ink)]'
                          : 'bg-[var(--foil-soft)] text-[var(--ink)]'
                      }`}
                    >
                      {user.role === 'admin' ? (
                        <Shield className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
                      {user.orderCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-[var(--ink)] data" style={{ fontFamily: 'var(--font-data)' }}>
                      ₹{user.totalSpent.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--ink-70)] data" style={{ fontFamily: 'var(--font-data)' }}>
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => openUser(user)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-[var(--ink)] hover:text-[var(--ink-70)]"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-[var(--foil-soft)] flex items-center justify-between">
          <div className="text-sm text-[var(--ink-70)] data" style={{ fontFamily: 'var(--font-data)' }}>
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => updateURL(filters, currentPage - 1)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm font-medium text-[var(--ink)] hover:bg-[var(--foil-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => updateURL(filters, currentPage + 1)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-[var(--foil-soft)] rounded-lg text-sm font-medium text-[var(--ink)] hover:bg-[var(--foil-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* User detail + role management */}
      <Drawer
        open={viewUser !== null}
        onClose={() => setViewUser(null)}
        title="User details"
        side="right"
      >
        {viewUser && (
          <div className="space-y-6 p-4">
            {/* Identity */}
            <div className="flex items-center gap-3">
              {viewUser.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={viewUser.image} alt={viewUser.name} className="h-12 w-12 rounded-full" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ink)] font-semibold text-[var(--paper-card)]">
                  {viewUser.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--ink)]">{viewUser.name}</p>
                <p className="flex items-center gap-1.5 truncate text-sm text-[var(--ink-70)]">
                  <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {viewUser.email}
                </p>
              </div>
            </div>

            {/* Contact + account (from the detail fetch) */}
            {detailLoading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--ink-70)]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading details…
              </div>
            ) : (
              detail && (
                <dl className="space-y-2 text-sm">
                  {detail.phoneNumber && (
                    <div className="flex items-center gap-1.5 text-[var(--ink-70)]">
                      <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="data text-[var(--ink)]">{detail.phoneNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-[var(--ink-70)]">Email verified</dt>
                    <dd className="text-[var(--ink)]">{detail.emailVerified ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--ink-70)]">Mobile verified</dt>
                    <dd className="text-[var(--ink)]">{detail.mobileVerified ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
              )
            )}

            {/* Activity (from the table row — already loaded) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] p-3">
                <p className="text-xs text-[var(--ink-70)]">Orders</p>
                <p className="data text-lg font-semibold text-[var(--ink)]">{viewUser.orderCount}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--foil-soft)] p-3">
                <p className="text-xs text-[var(--ink-70)]">Total spent</p>
                <p className="data text-lg font-semibold text-[var(--ink)]">
                  ₹{viewUser.totalSpent.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <p className="text-sm text-[var(--ink-70)]">
              Joined <span className="data text-[var(--ink)]">{formatDate(viewUser.createdAt)}</span>
            </p>

            {/* Role management — backed by PATCH /api/admin/users/[id] */}
            <div>
              <label
                htmlFor="user-role"
                className="mb-2 block text-sm font-medium text-[var(--ink)]"
              >
                Role
              </label>
              <select
                id="user-role"
                value={viewUser.role}
                disabled={savingRole}
                onChange={(e) => changeRole(e.target.value)}
                className="w-full rounded-lg border border-[var(--foil-soft)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ink)] disabled:opacity-60"
              >
                <option value="client">Client</option>
                <option value="admin">Admin</option>
              </select>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--ink-40)]">
                {savingRole && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                Admins can manage the whole store. You cannot change your own role.
              </p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
