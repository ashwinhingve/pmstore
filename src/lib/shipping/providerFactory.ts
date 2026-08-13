import type { IShippingProvider } from './types';
import { delhiveryService } from './delhivery';
// Imported lazily to avoid initialising Shiprocket until it's actually needed
import { shiprocketService } from './shiprocket';

export type ShippingProviderName = 'delhivery' | 'shiprocket';

export function getShippingProvider(provider: string): IShippingProvider {
  switch (provider) {
    case 'shiprocket':
      return shiprocketService;
    case 'delhivery':
    default:
      return delhiveryService;
  }
}

/**
 * The courier used for auto-created shipments (paid-order callback, retry queue,
 * payment sync) when no provider is passed explicitly. Driven by env so the
 * pharmacy can switch couriers without a deploy. Falls back to 'delhivery' if
 * the env var is unset or invalid, so a missing config never breaks fulfilment.
 */
export function getDefaultProvider(): ShippingProviderName {
  const p = process.env.DEFAULT_SHIPPING_PROVIDER;
  return p === 'shiprocket' || p === 'delhivery' ? p : 'delhivery';
}
