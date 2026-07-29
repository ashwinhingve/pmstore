"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addressSchema, type AddressFormData } from '@/lib/validations/checkout';
import { toast } from '@/store/useToastStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';

interface AddressStepProps {
  onNext: (addressId: string) => void;
  disabled?: boolean;
}

export function AddressStep({ onNext, disabled }: AddressStepProps) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pincodeLookup, setPincodeLookup] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema) as any,
    defaultValues: {
      type: 'shipping',
      country: 'India',
      isDefault: false,
    },
  });

  const postalCode = watch('postalCode');

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Auto-fetch city/state from PIN code
  useEffect(() => {
    if (!postalCode || postalCode.length !== 6 || !/^\d{6}$/.test(postalCode)) {
      return;
    }

    const controller = new AbortController();
    setPincodeLookup({ loading: true, error: null });

    fetch(`/api/pincode?pincode=${postalCode}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.city) {
          setValue('city', data.city, { shouldValidate: true });
          setValue('state', data.state, { shouldValidate: true });
          setPincodeLookup({ loading: false, error: null });
        } else {
          setPincodeLookup({ loading: false, error: data.error || 'Invalid pincode' });
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setPincodeLookup({ loading: false, error: null });
        }
      });

    return () => controller.abort();
  }, [postalCode, setValue]);

  async function fetchAddresses() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/addresses');
      if (response.ok) {
        const data = await response.json();
        setAddresses(data);

        const defaultAddress = data.find((addr: any) => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress._id);
        } else if (data.length > 0) {
          setSelectedAddressId(data[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(data: AddressFormData) {
    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const newAddress = await response.json();
        setAddresses([...addresses, newAddress]);
        setSelectedAddressId(newAddress._id);
        setShowNewAddressForm(false);
        reset();
      } else {
        const error = await response.json();
        toast.error(error.error || "Couldn't save the address. Check the details and try again.");
      }
    } catch (error) {
      console.error('Failed to save address:', error);
      toast.error("Couldn't save the address. Try again.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--ink)] mb-2">Delivery Address</h2>
        <p className="text-[var(--ink-70)]">Select or add a delivery address</p>
      </div>

      {/* Loading State — skeleton matching the address card layout, not a spinner (avoids CLS) */}
      {isLoading && (
        <div className="space-y-4" aria-hidden="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg border-2 border-[var(--foil-soft)] p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-[var(--foil-soft)]" />
                  <div className="h-3.5 w-2/3 rounded bg-[var(--foil-soft)]" />
                  <div className="h-3.5 w-1/2 rounded bg-[var(--foil-soft)]" />
                  <div className="h-3.5 w-1/3 rounded bg-[var(--foil-soft)]" />
                </div>
                <div className="mt-1 h-4 w-4 shrink-0 rounded-full bg-[var(--foil-soft)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Saved Addresses */}
      {!isLoading && addresses.length > 0 && !showNewAddressForm && (
        <div className="space-y-4">
          {addresses.map((address) => (
            <div
              key={address._id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedAddressId === address._id
                  ? 'border-[var(--ink)] bg-[var(--foil-soft)]'
                  : 'border-[var(--foil-soft)] hover:border-[var(--foil)]'
              }`}
              onClick={() => setSelectedAddressId(address._id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-[var(--ink)]">{address.fullName}</h3>
                    {address.isDefault && (
                      <span className="bg-[var(--foil-soft)] text-[var(--ink-70)] text-xs px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--ink-70)] mt-1">
                    {address.addressLine1}
                    {address.addressLine2 && `, ${address.addressLine2}`}
                  </p>
                  <p className="text-sm text-[var(--ink-70)]">
                    {address.city}, {address.state} - <span className="pack">{address.postalCode}</span>
                  </p>
                  <p className="text-sm text-[var(--ink-70)] mt-1">
                    Phone: {address.phoneNumber}
                  </p>
                </div>
                <input
                  type="radio"
                  checked={selectedAddressId === address._id}
                  onChange={() => setSelectedAddressId(address._id)}
                  className="mt-1 w-4 h-4 text-[var(--ink)] focus:ring-[var(--ink)]"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Addresses Message */}
      {!isLoading && addresses.length === 0 && !showNewAddressForm && (
        <div className="text-center py-8 bg-[var(--foil-soft)] rounded-lg border-2 border-dashed border-[var(--foil)]">
          <p className="text-[var(--ink-70)] mb-4">No saved addresses found</p>
          <Button
            onClick={() => setShowNewAddressForm(true)}
            className="bg-[var(--brand)] hover:opacity-90 text-[var(--brand-ink)]"
          >
            Add Your First Address
          </Button>
        </div>
      )}

      {/* New Address Form */}
      {showNewAddressForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border-2 rounded-lg p-6 bg-[var(--paper-card)]">
          <h3 className="font-semibold text-lg text-[var(--ink)] mb-4">Add New Address</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Full Name" required error={errors.fullName?.message}>
              <Input
                {...register('fullName')}
                placeholder="Enter your full name"
                error={errors.fullName?.message}
              />
            </FormField>

            <FormField label="Phone Number" required error={errors.phoneNumber?.message}>
              <Input
                {...register('phoneNumber')}
                placeholder="10-digit mobile number"
                maxLength={10}
                error={errors.phoneNumber?.message}
              />
            </FormField>

            <FormField label="Address Line 1" required error={errors.addressLine1?.message} className="md:col-span-2">
              <Input
                {...register('addressLine1')}
                placeholder="House No., Building Name"
                error={errors.addressLine1?.message}
              />
            </FormField>

            <FormField label="Address Line 2" error={errors.addressLine2?.message} className="md:col-span-2">
              <Input
                {...register('addressLine2')}
                placeholder="Road name, Area, Colony (Optional)"
              />
            </FormField>

            <FormField label="PIN Code" required error={errors.postalCode?.message || pincodeLookup.error || undefined}>
              <div className="relative">
                <Input
                  {...register('postalCode')}
                  placeholder="6-digit PIN code"
                  maxLength={6}
                  error={errors.postalCode?.message}
                />
                {pincodeLookup.loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-[var(--ink)] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </FormField>

            <FormField label="City" required error={errors.city?.message}>
              <Input
                {...register('city')}
                placeholder="City (auto-filled from PIN)"
                error={errors.city?.message}
              />
            </FormField>

            <FormField label="State" required error={errors.state?.message}>
              <Input
                {...register('state')}
                placeholder="State (auto-filled from PIN)"
                error={errors.state?.message}
              />
            </FormField>

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isDefault')}
                  className="w-4 h-4 text-[var(--ink)] border-[var(--foil-soft)] rounded focus:ring-[var(--ink)]"
                />
                <span className="ml-2 text-sm text-[var(--ink-70)]">Set as default address</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--ink)] hover:opacity-90 text-[var(--paper-card)]"
            >
              {isSubmitting ? 'Saving...' : 'Save Address'}
            </Button>
            {addresses.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNewAddressForm(false);
                  reset();
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}

      {/* Add New Address Button (when addresses exist and form is hidden) */}
      {!isLoading && addresses.length > 0 && !showNewAddressForm && (
        <Button
          variant="outline"
          onClick={() => setShowNewAddressForm(true)}
          className="w-full border-2 border-dashed border-[var(--foil)] hover:border-[var(--ink)]"
        >
          + Add New Address
        </Button>
      )}

      {/* Continue Button */}
      {!showNewAddressForm && (
        <Button
          onClick={() => selectedAddressId && onNext(selectedAddressId)}
          disabled={!selectedAddressId || isLoading}
          className="w-full py-6 text-lg bg-[var(--ink)] hover:opacity-90 text-[var(--paper-card)]"
        >
          Continue to Payment
        </Button>
      )}
    </div>
  );
}
