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
} from 'lucide-react';

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Search and Filter Bar */}
      <div className="p-4 border-b border-gray-200 space-y-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Filter Button */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              hasActiveFilters
                ? 'bg-amber-50 border-amber-500 text-amber-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-amber-600 text-white text-xs rounded-full px-2 py-0.5">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Role
                </label>
                <select
                  value={localFilters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">All Roles</option>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={localFilters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="createdAt">Recent Signups</option>
                  <option value="orders">Most Orders</option>
                  <option value="spent">Highest Spending</option>
                </select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-red-700 text-white text-sm font-medium rounded-lg hover:from-amber-700 hover:to-red-800"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Orders
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Total Spent
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-600 to-red-700 flex items-center justify-center text-white font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
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
                    <div className="text-sm font-medium text-gray-900">
                      {user.orderCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      ₹{user.totalSpent.toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700"
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
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => updateURL(filters, currentPage - 1)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => updateURL(filters, currentPage + 1)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
