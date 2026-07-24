'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Tag, Percent,
  IndianRupee, Calendar, Users, TrendingUp, Loader2,
  X, Save, Gift, Ticket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Discount {
  _id: string;
  code: string;
  name: string;
  description: string;
  type: 'first_order' | 'auto' | 'coupon';
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  maxDiscountAmount: number;
  minOrderValue: number;
  maxUsageTotal: number;
  maxUsagePerUser: number;
  totalUsed: number;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
}

interface FormState {
  code: string;
  name: string;
  description: string;
  type: 'first_order' | 'auto' | 'coupon';
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  maxDiscountAmount: number;
  minOrderValue: number;
  maxUsageTotal: number;
  maxUsagePerUser: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  code: '',
  name: '',
  description: '',
  type: 'coupon',
  discountType: 'fixed',
  discountValue: 0,
  maxDiscountAmount: 0,
  minOrderValue: 0,
  maxUsageTotal: 0,
  maxUsagePerUser: 1,
  validFrom: new Date().toISOString().slice(0, 10),
  validTo: '',
  isActive: true,
};

const TYPE_LABELS: Record<string, { label: string; color: string; icon: any; hint: string }> = {
  first_order: {
    label: 'First Order',
    color: 'bg-[var(--foil-soft)] text-[var(--ink)]',
    icon: Gift,
    hint: 'Auto-applied to customers who have never placed an order before',
  },
  auto: {
    label: 'Auto-Apply',
    color: 'bg-[var(--foil-soft)] text-[var(--ink)]',
    icon: TrendingUp,
    hint: 'Automatically applied to all eligible orders (no code needed)',
  },
  coupon: {
    label: 'Coupon Code',
    color: 'bg-[var(--mint-soft)] text-[var(--mint)]',
    icon: Ticket,
    hint: 'Customer enters this code manually at cart/checkout',
  },
};

export default function AdminOffersPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');

  const fetchDiscounts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/discounts');
      const data = await res.json();
      if (res.ok) setDiscounts(data.discounts);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowForm(true);
  }

  function openEdit(d: Discount) {
    setEditingId(d._id);
    setForm({
      code: d.code,
      name: d.name,
      description: d.description,
      type: d.type,
      discountType: d.discountType,
      discountValue: d.discountValue,
      maxDiscountAmount: d.maxDiscountAmount,
      minOrderValue: d.minOrderValue,
      maxUsageTotal: d.maxUsageTotal,
      maxUsagePerUser: d.maxUsagePerUser,
      validFrom: d.validFrom ? d.validFrom.slice(0, 10) : '',
      validTo: d.validTo ? d.validTo.slice(0, 10) : '',
      isActive: d.isActive,
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSave() {
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (form.type === 'coupon' && !form.code.trim()) { setFormError('Coupon code is required'); return; }
    if (form.discountValue <= 0) { setFormError('Discount value must be greater than 0'); return; }
    if (form.discountType === 'percentage' && form.discountValue > 100) {
      setFormError('Percentage cannot exceed 100'); return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/admin/discounts/${editingId}` : '/api/admin/discounts';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          validTo: form.validTo || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Save failed'); return; }
      setShowForm(false);
      await fetchDiscounts();
    } catch {
      setFormError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this discount? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/discounts/${id}`, { method: 'DELETE' });
      setDiscounts((prev) => prev.filter((d) => d._id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggle(d: Discount) {
    setTogglingId(d._id);
    try {
      const res = await fetch(`/api/admin/discounts/${d._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !d.isActive }),
      });
      if (res.ok) {
        setDiscounts((prev) =>
          prev.map((x) => (x._id === d._id ? { ...x, isActive: !x.isActive } : x))
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  // Stats
  const total = discounts.length;
  const active = discounts.filter((d) => d.isActive).length;
  const totalUsed = discounts.reduce((s, d) => s + d.totalUsed, 0);
  const firstOrder = discounts.filter((d) => d.type === 'first_order').length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink)]">Offers Management</h1>
          <p className="text-sm text-[var(--ink-40)] mt-1">
            Create and manage discount codes, automatic offers, and first-order deals.
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-gradient-to-r from-[var(--ink)] to-[var(--ink)] hover:opacity-90 text-white"
          disabled={showForm}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Offer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Offers', value: total, icon: Tag, color: 'text-[var(--ink)]', bg: 'bg-[var(--foil-soft)]' },
          { label: 'Active', value: active, icon: Eye, color: 'text-[var(--mint)]', bg: 'bg-[var(--mint-soft)]' },
          { label: 'Inactive', value: total - active, icon: EyeOff, color: 'text-[var(--ink-40)]', bg: 'bg-[var(--foil-soft)]' },
          { label: 'Total Used', value: totalUsed, icon: TrendingUp, color: 'text-[var(--ink)]', bg: 'bg-[var(--foil-soft)]' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-4 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--ink)]">{value}</p>
              <p className="text-xs text-[var(--ink-40)]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="bg-[var(--paper-card)] border-2 border-[var(--foil)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-[var(--ink)]">
              {editingId ? 'Edit Offer' : 'New Offer'}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg hover:bg-[var(--foil-soft)] text-[var(--ink-40)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Offer Type */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[var(--ink-70)] mb-2 uppercase tracking-wide">Offer Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(TYPE_LABELS) as [string, (typeof TYPE_LABELS)[string]][]).map(([key, { label, color, icon: Icon, hint }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, type: key as any, code: key !== 'coupon' ? '' : form.code })}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                      form.type === key
                        ? 'border-[var(--foil-soft)] bg-[var(--foil-soft)]'
                        : 'border-[var(--foil-soft)] hover:border-[var(--foil-soft)] bg-[var(--paper-card)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[var(--ink-70)]" />
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                    </div>
                    <p className="text-xs text-[var(--ink-40)] leading-snug">{hint}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">Offer Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Welcome Discount"
              />
            </div>

            {/* Coupon Code (only for coupon type) */}
            <div>
              <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">
                Coupon Code {form.type === 'coupon' ? '*' : '(optional for coupon type)'}
              </label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g., SAVE20"
                disabled={form.type !== 'coupon'}
                className="font-mono uppercase"
              />
              {form.type !== 'coupon' && (
                <p className="mt-1 text-xs text-[var(--ink-40)]">Not required — this offer is auto-applied</p>
              )}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short description shown to customers"
              />
            </div>

            {/* Discount Type + Value */}
            <div>
              <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">Discount Type *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, discountType: 'fixed' })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    form.discountType === 'fixed'
                      ? 'border-[var(--foil-soft)] bg-[var(--foil-soft)] text-[var(--ink)]'
                      : 'border-[var(--foil-soft)] text-[var(--ink-70)] hover:border-[var(--foil-soft)] bg-[var(--paper-card)]'
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5" /> Fixed (₹)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, discountType: 'percentage' })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    form.discountType === 'percentage'
                      ? 'border-[var(--foil-soft)] bg-[var(--foil-soft)] text-[var(--ink)]'
                      : 'border-[var(--foil-soft)] text-[var(--ink-70)] hover:border-[var(--foil-soft)] bg-[var(--paper-card)]'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" /> Percentage (%)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">
                Discount Value * {form.discountType === 'percentage' ? '(%)' : '(₹)'}
              </label>
              <Input
                type="number"
                min={0}
                max={form.discountType === 'percentage' ? 100 : undefined}
                value={form.discountValue || ''}
                onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
                placeholder={form.discountType === 'fixed' ? '10' : '15'}
              />
            </div>

            {/* Max Discount (only for percentage) */}
            {form.discountType === 'percentage' && (
              <div>
                <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">
                  Max Discount Cap (₹) <span className="text-[var(--ink-40)]">0 = no cap</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxDiscountAmount || ''}
                  onChange={(e) => setForm({ ...form, maxDiscountAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            )}

            {/* Min Order Value */}
            <div>
              <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">
                Min Order Value (₹) <span className="text-[var(--ink-40)]">0 = no minimum</span>
              </label>
              <Input
                type="number"
                min={0}
                value={form.minOrderValue || ''}
                onChange={(e) => setForm({ ...form, minOrderValue: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            {/* Usage Limits */}
            <div>
              <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">
                Total Usage Limit <span className="text-[var(--ink-40)]">0 = unlimited</span>
              </label>
              <Input
                type="number"
                min={0}
                value={form.maxUsageTotal || ''}
                onChange={(e) => setForm({ ...form, maxUsageTotal: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">
                Uses Per Customer <span className="text-[var(--ink-40)]">0 = unlimited</span>
              </label>
              <Input
                type="number"
                min={0}
                value={form.maxUsagePerUser || ''}
                onChange={(e) => setForm({ ...form, maxUsagePerUser: parseInt(e.target.value) || 0 })}
                placeholder="1"
              />
            </div>

            {/* Validity */}
            <div>
              <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" /> Valid From *
              </label>
              <Input
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--ink-70)] mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1" /> Valid To <span className="text-[var(--ink-40)]">(leave blank = no expiry)</span>
              </label>
              <Input
                type="date"
                value={form.validTo}
                onChange={(e) => setForm({ ...form, validTo: e.target.value })}
              />
            </div>

            {/* Active toggle */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-[var(--ink)]"
                />
                <span className="text-sm text-[var(--ink)] font-medium">Active (visible and applicable to customers)</span>
              </label>
            </div>
          </div>

          {formError && (
            <div className="mt-4 p-3 bg-[var(--foil-soft)] border border-[var(--foil)] rounded-lg text-sm text-[var(--ink-70)] flex items-center gap-2">
              <X className="w-4 h-4 flex-shrink-0" /> {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-[var(--ink)] to-[var(--ink)] hover:opacity-90 text-white"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> {editingId ? 'Update Offer' : 'Create Offer'}</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Discounts Table */}
      <div className="bg-[var(--paper-card)] rounded-xl border border-[var(--foil-soft)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--ink)]" />
          </div>
        ) : discounts.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="w-12 h-12 text-[var(--ink-40)] mx-auto mb-3" />
            <p className="text-[var(--ink-40)] font-medium">No offers yet</p>
            <p className="text-sm text-[var(--ink-40)] mt-1">Click &quot;New Offer&quot; to create your first discount</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--foil-soft)] bg-[var(--foil-soft)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-40)] uppercase tracking-wide">Offer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-40)] uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-40)] uppercase tracking-wide">Discount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-40)] uppercase tracking-wide">Limits</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-40)] uppercase tracking-wide">Validity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-40)] uppercase tracking-wide">Used</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-40)] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--foil-soft)]">
                {discounts.map((d) => {
                  const typeInfo = TYPE_LABELS[d.type];
                  const TypeIcon = typeInfo.icon;
                  return (
                    <tr key={d._id} className={`hover:bg-[var(--foil-soft)]/50 transition-colors ${!d.isActive ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[var(--ink)] text-sm">{d.name}</p>
                        {d.code && (
                          <span className="text-xs font-mono bg-[var(--foil-soft)] text-[var(--ink)] px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            {d.code}
                          </span>
                        )}
                        {d.description && (
                          <p className="text-xs text-[var(--ink-40)] mt-0.5 truncate max-w-[180px]">{d.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${typeInfo.color}`}>
                          <TypeIcon className="w-3 h-3" />
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-bold text-[var(--ink)]">
                          {d.discountType === 'fixed' ? `₹${d.discountValue}` : `${d.discountValue}%`}
                        </span>
                        {d.discountType === 'percentage' && d.maxDiscountAmount > 0 && (
                          <p className="text-xs text-[var(--ink-40)]">max ₹{d.maxDiscountAmount}</p>
                        )}
                        {d.minOrderValue > 0 && (
                          <p className="text-xs text-[var(--ink-40)]">min ₹{d.minOrderValue}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-xs text-[var(--ink-70)] space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {d.maxUsagePerUser === 0 ? '∞ per user' : `${d.maxUsagePerUser}x/user`}
                          </div>
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {d.maxUsageTotal === 0 ? 'Unlimited total' : `${d.maxUsageTotal} total`}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[var(--ink-40)]">
                        <div>From {new Date(d.validFrom).toLocaleDateString('en-IN')}</div>
                        {d.validTo ? (
                          <div>To {new Date(d.validTo).toLocaleDateString('en-IN')}</div>
                        ) : (
                          <div className="text-[var(--mint)]">No expiry</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm font-semibold text-[var(--ink)]">{d.totalUsed}</div>
                        {d.maxUsageTotal > 0 && (
                          <div className="w-16 h-1.5 bg-[var(--foil-soft)] rounded-full mt-1">
                            <div
                              className="h-1.5 bg-[var(--mint)] rounded-full"
                              style={{ width: `${Math.min(100, (d.totalUsed / d.maxUsageTotal) * 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggle(d)}
                          disabled={togglingId === d._id}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                            d.isActive
                              ? 'bg-[var(--mint-soft)] text-[var(--mint)] hover:opacity-80'
                              : 'bg-[var(--foil-soft)] text-[var(--ink-40)] hover:opacity-80'
                          }`}
                        >
                          {togglingId === d._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : d.isActive ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                          {d.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(d)}
                            className="p-1.5 rounded-lg hover:bg-[var(--foil-soft)] text-[var(--ink)] transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(d._id)}
                            disabled={deletingId === d._id}
                            className="p-1.5 rounded-lg hover:bg-[var(--foil-soft)] text-[var(--ink-70)] transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === d._id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* First-order note */}
      {firstOrder === 0 && !loading && (
        <div className="flex items-start gap-3 p-4 bg-[var(--mint-soft)] border border-[var(--mint)] rounded-xl text-sm">
          <Gift className="w-5 h-5 text-[var(--mint)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[var(--ink)]">First-order discount will be auto-created</p>
            <p className="text-[var(--ink-70)] mt-0.5">
              A default ₹10 first-order discount is automatically seeded when the first customer visits the cart.
              Create a &quot;First Order&quot; type offer above to configure it explicitly.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
