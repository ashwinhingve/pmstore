import type {
  IShippingProvider,
  ShipmentCreationData,
  ShipmentCreationResult,
  TrackingResult,
} from './types';

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

class ShiprocketService implements IShippingProvider {
  readonly providerName = 'shiprocket';

  // Token cache — Shiprocket tokens are valid for 10 days
  private tokenCache: { token: string; expiresAt: number } | null = null;
  // Promise-based mutex: prevents concurrent login requests when the token expires
  private tokenFetchPromise: Promise<string> | null = null;

  private get isConfigured(): boolean {
    return !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
  }

  // ─── Token management ─────────────────────────────────────────────────────

  private async getToken(): Promise<string> {
    // Shiprocket uses JWT tokens obtained via email+password login (valid 10 days)
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 300_000) {
      return this.tokenCache.token;
    }
    if (this.tokenFetchPromise) return this.tokenFetchPromise;

    this.tokenFetchPromise = this.fetchFreshToken().finally(() => {
      this.tokenFetchPromise = null;
    });
    return this.tokenFetchPromise;
  }

  private async fetchFreshToken(): Promise<string> {
    const email = process.env.SHIPROCKET_EMAIL;
    const password = process.env.SHIPROCKET_PASSWORD;

    if (!email || !password) {
      throw new Error('Shiprocket not configured: set SHIPROCKET_API_TOKEN or SHIPROCKET_EMAIL + SHIPROCKET_PASSWORD');
    }

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Shiprocket login failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    const token: string = data.token;
    if (!token) throw new Error('Shiprocket login returned no token');

    this.tokenCache = { token, expiresAt: Date.now() + 10 * 24 * 60 * 60 * 1000 };
    console.log('Shiprocket JWT token refreshed');
    return token;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  // ─── IShippingProvider methods ─────────────────────────────────────────────

  async checkServiceability(
    pincode: string,
    originPincode?: string,
    weight = 500,
    cod = false
  ): Promise<{ serviceable: boolean; estimatedDays?: number; error?: string }> {
    if (!this.isConfigured) {
      return { serviceable: false, error: 'Shiprocket not configured' };
    }

    try {
      const origin = originPincode || process.env.WAREHOUSE_PINCODE || '';
      const weightKg = (weight / 1000).toFixed(2);
      const params = new URLSearchParams({
        pickup_postcode: origin,
        delivery_postcode: pincode,
        weight: weightKg,
        cod: cod ? '1' : '0',
      });

      const headers = await this.authHeaders();
      const res = await fetch(`${BASE_URL}/courier/serviceability/?${params}`, {
        method: 'GET',
        headers,
      });

      const data = await res.json();
      const couriers: any[] = data.data?.available_courier_companies || [];

      if (couriers.length === 0) {
        return { serviceable: false };
      }

      // Pick the recommended courier (lowest estimated_delivery_days)
      const best = couriers.reduce((a, b) =>
        (a.estimated_delivery_days || 99) < (b.estimated_delivery_days || 99) ? a : b
      );

      return {
        serviceable: true,
        estimatedDays: best.estimated_delivery_days || undefined,
      };
    } catch (error: any) {
      console.error('Shiprocket serviceability error:', error);
      return { serviceable: false, error: error.message };
    }
  }

  async createShipment(
    data: ShipmentCreationData
  ): Promise<{ success: boolean; result?: ShipmentCreationResult; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Shiprocket not configured' };
    }

    try {
      const headers = await this.authHeaders();

      // Fetch actual pickup location name from Shiprocket if not set or wrong
      const pickupLocation = await this.getPickupLocationName();

      const payload = {
        order_id: data.orderNumber,
        order_date: new Date().toISOString().split('T')[0],
        pickup_location: pickupLocation,
        channel_id: '',
        comment: '',
        // Billing address (Shiprocket requires it; mirror shipping address)
        billing_customer_name: data.customerName,
        billing_last_name: '',
        billing_address: data.deliveryAddress.line1,
        billing_address_2: data.deliveryAddress.line2 || '',
        billing_city: data.deliveryAddress.city,
        billing_pincode: data.deliveryAddress.pincode,
        billing_state: data.deliveryAddress.state,
        billing_country: data.deliveryAddress.country || 'India',
        billing_email: data.customerEmail || '',
        billing_phone: data.customerPhone,
        // Shipping address
        shipping_is_billing: 1,
        shipping_customer_name: data.customerName,
        shipping_last_name: '',
        shipping_address: data.deliveryAddress.line1,
        shipping_address_2: data.deliveryAddress.line2 || '',
        shipping_city: data.deliveryAddress.city,
        shipping_pincode: data.deliveryAddress.pincode,
        shipping_country: data.deliveryAddress.country || 'India',
        shipping_state: data.deliveryAddress.state,
        shipping_email: data.customerEmail || '',
        shipping_phone: data.customerPhone,
        // Order items
        order_items: data.items.map((item) => ({
          name: item.name,
          sku: item.sku,
          units: item.quantity,
          selling_price: item.price,
          discount: 0,
          tax: 0,
          hsn: '',
        })),
        payment_method: data.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        shipping_charges: 0,
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,
        sub_total: data.totalValue,
        length: parseFloat(process.env.SHIPROCKET_DEFAULT_LENGTH || '15'),
        breadth: parseFloat(process.env.SHIPROCKET_DEFAULT_BREADTH || '12'),
        height: parseFloat(process.env.SHIPROCKET_DEFAULT_HEIGHT || '10'),
        weight: data.totalWeight / 1000, // kg
      };

      const res = await fetch(`${BASE_URL}/orders/create/adhoc`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const raw = await res.json();
      console.log('Shiprocket createShipment raw response:', JSON.stringify(raw));

      if (!res.ok || raw.status_code === 422) {
        const message = raw.message || raw.errors?.join(', ') || 'Shiprocket order creation failed';
        console.error('Shiprocket createShipment error:', raw);
        return { success: false, error: message };
      }

      const shipmentId = String(raw.shipment_id || '');
      if (!shipmentId || shipmentId === '0') {
        return { success: false, error: `Shiprocket order creation failed: ${raw.message || JSON.stringify(raw)}` };
      }

      // AWB is assigned asynchronously — it may be empty right after order creation.
      // If missing, assign the courier automatically then fetch the AWB.
      let awbCode: string = raw.awb_code || '';
      let courierName: string = raw.courier_name || 'Shiprocket';

      if (!awbCode) {
        const assigned = await this.assignCourierAndGetAWB(shipmentId);
        if (assigned.awb) {
          awbCode = assigned.awb;
          courierName = assigned.courierName || courierName;
        }
      }

      // If AWB still missing, use shipmentId as fallback waybill so the order
      // is at least recorded — admin can check Shiprocket dashboard for the AWB
      const waybill = awbCode || `SR-${shipmentId}`;

      return {
        success: true,
        result: {
          waybill,
          shipmentId,
          courierName,
          trackingUrl: awbCode
            ? `https://shiprocket.co/tracking/${awbCode}`
            : `https://app.shiprocket.in/orders/details/${shipmentId}`,
        },
      };
    } catch (error: any) {
      console.error('Error creating Shiprocket shipment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Returns the configured pickup location name, falling back to the first
   * active pickup location in the Shiprocket account.
   */
  private async getPickupLocationName(): Promise<string> {
    const configured = process.env.SHIPROCKET_PICKUP_LOCATION;
    try {
      const headers = await this.authHeaders();
      const res = await fetch(`${BASE_URL}/settings/company/pickup`, {
        method: 'GET',
        headers,
      });
      const data = await res.json();
      const locations: any[] = data.data?.shipping_address || [];
      console.log('Shiprocket pickup locations:', locations.map((l: any) => l.pickup_location));

      if (locations.length === 0) return configured || 'Primary';

      // If configured name matches exactly, use it
      if (configured) {
        const match = locations.find(
          (l: any) => l.pickup_location === configured && l.status === 1
        );
        if (match) return match.pickup_location;
      }

      // Fall back to first active location
      const active = locations.find((l: any) => l.status === 1) || locations[0];
      const name: string = active.pickup_location;
      console.log(`Shiprocket: using pickup location "${name}" (configured: "${configured}")`);
      return name;
    } catch (err) {
      console.error('Shiprocket: failed to fetch pickup locations:', err);
      return configured || 'Primary';
    }
  }

  /**
   * Assign the recommended courier to a shipment and return its AWB code.
   * Called automatically when create/adhoc returns without an AWB.
   */
  private async assignCourierAndGetAWB(
    shipmentId: string
  ): Promise<{ awb?: string; courierName?: string }> {
    try {
      const headers = await this.authHeaders();

      // Step 1: get recommended courier id
      const srRes = await fetch(
        `${BASE_URL}/courier/serviceability/?shipment_id=${shipmentId}`,
        { method: 'GET', headers }
      );
      const srData = await srRes.json();
      const couriers: any[] = srData.data?.available_courier_companies || [];
      if (couriers.length === 0) {
        console.warn('Shiprocket: no couriers available for shipment', shipmentId);
        return {};
      }

      // Pick recommended or cheapest
      const recommended = couriers.find((c: any) => c.is_recommended) || couriers[0];
      const courierId: number = recommended.courier_company_id;

      // Step 2: assign courier → triggers AWB generation
      const assignRes = await fetch(`${BASE_URL}/courier/assign/awb`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ shipment_id: [shipmentId], courier_id: String(courierId) }),
      });
      const assignData = await assignRes.json();
      console.log('Shiprocket assignCourier response:', JSON.stringify(assignData));

      const awb: string =
        assignData.response?.data?.awb_code ||
        assignData.awb_code ||
        assignData.awb ||
        '';

      return { awb, courierName: recommended.courier_name || 'Shiprocket' };
    } catch (err) {
      console.error('Shiprocket assignCourierAndGetAWB error:', err);
      return {};
    }
  }

  /**
   * @param identifier  Shiprocket shipment_id (numeric string, NOT the AWB).
   *                    This is stored as Shipment.providerShipmentId.
   */
  async trackShipment(identifier: string): Promise<TrackingResult | null> {
    if (!this.isConfigured) return null;

    try {
      const headers = await this.authHeaders();
      const res = await fetch(`${BASE_URL}/courier/track/shipment/${identifier}`, {
        method: 'GET',
        headers,
      });

      const data = await res.json();
      const trackData = data.tracking_data;

      if (!trackData || !trackData.shipment_track?.[0]) {
        return null;
      }

      const track = trackData.shipment_track[0];
      const activities: any[] = trackData.shipment_track_activities || [];
      const status: string = track.current_status || 'PENDING';

      return {
        waybill: track.awb_code || identifier,
        status,
        mappedStatus: this.mapStatus(status),
        currentLocation: track.current_status_description || undefined,
        expectedDelivery: track.edd || undefined,
        scans: activities.map((a: any) => ({
          timestamp: a.date || '',
          location: a.location || '',
          activity: a.activity || '',
          status: a.status || '',
        })),
      };
    } catch (error) {
      console.error('Error tracking Shiprocket shipment:', error);
      return null;
    }
  }

  /**
   * @param identifier  Shiprocket order_id string (same as our orderNumber).
   */
  async cancelShipment(identifier: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Shiprocket not configured' };
    }

    try {
      const headers = await this.authHeaders();
      const res = await fetch(`${BASE_URL}/orders/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ids: [identifier] }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        return { success: true };
      }
      return { success: false, error: data.message || 'Cancel failed' };
    } catch (error: any) {
      console.error('Error cancelling Shiprocket shipment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * @param identifier  Shiprocket shipment_id (numeric string).
   */
  getShippingLabelUrl(identifier: string): string {
    // Label generation requires a POST — return the API endpoint as a ref
    // Admins can generate labels via the Shiprocket dashboard or a dedicated endpoint
    return `${BASE_URL}/orders/print/label?shipment_id=${identifier}`;
  }

  mapStatus(shiprocketStatus: string): string {
    const upper = (shiprocketStatus || '').toUpperCase();
    const statusMap: Record<string, string> = {
      'PENDING': 'processing',
      'PICKUP PENDING': 'processing',
      'PICKUP QUEUED': 'processing',
      'PICKUP ERROR': 'processing',
      'PICKUP RESCHEDULED': 'processing',
      'MANIFESTED': 'processing',
      'SHIPPED': 'shipped',
      'IN TRANSIT': 'shipped',
      'OUT FOR DELIVERY': 'shipped',
      'DELIVERED': 'delivered',
      'DELIVERY FAILED': 'shipped',
      'CANCELLED': 'cancelled',
      'LOST': 'cancelled',
      'DAMAGED': 'cancelled',
      'RTO': 'cancelled',
      'RTO INITIATED': 'cancelled',
      'RTO DELIVERED': 'cancelled',
      'RTO OUT FOR DELIVERY': 'cancelled',
    };
    return statusMap[upper] || 'processing';
  }
}

export const shiprocketService = new ShiprocketService();
