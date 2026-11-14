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
 * Default courier when no explicit selection is supplied. Courier booking still
 * requires admin-confirmed packed measurements; payments never auto-book it.
 */
export function getDefaultProvider(): ShippingProviderName {
  const p = process.env.DEFAULT_SHIPPING_PROVIDER;
  return p === 'shiprocket' || p === 'delhivery' ? p : 'delhivery';
}
