export interface ShipmentCreationData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: number;
    weight: number; // grams per unit
  }>;
  totalWeight: number; // grams
  totalValue: number;
  paymentMethod: 'prepaid' | 'cod';
  codAmount?: number;
}

export interface ShipmentCreationResult {
  waybill: string;        // customer-facing AWB / tracking number
  shipmentId: string;     // provider's internal ID used for API calls
                          // Delhivery: same as waybill; Shiprocket: numeric shipment_id
  courierName: string;
  trackingUrl: string;
  estimatedDelivery?: string;
}

export interface TrackingResult {
  waybill: string;
  status: string;           // provider-native status string
  mappedStatus: string;     // internal: 'processing' | 'shipped' | 'delivered' | 'cancelled'
  currentLocation?: string;
  expectedDelivery?: string;
  scans: Array<{
    timestamp: string;
    location: string;
    activity: string;
    status: string;
  }>;
}

export interface IShippingProvider {
  readonly providerName: string;

  checkServiceability(
    pincode: string,
    originPincode?: string,
    weight?: number,
    cod?: boolean
  ): Promise<{ serviceable: boolean; estimatedDays?: number; error?: string }>;

  createShipment(
    data: ShipmentCreationData
  ): Promise<{ success: boolean; result?: ShipmentCreationResult; error?: string }>;

  /**
   * @param identifier  Shiprocket: providerShipmentId (numeric). Delhivery: waybill.
   */
  trackShipment(identifier: string): Promise<TrackingResult | null>;

  cancelShipment(identifier: string): Promise<{ success: boolean; error?: string }>;

  getShippingLabelUrl(identifier: string): string;

  /** Maps a provider-native status string to our internal order status. */
  mapStatus(providerStatus: string): string;
}
