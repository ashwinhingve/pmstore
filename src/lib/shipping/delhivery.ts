import type {
  IShippingProvider,
  ShipmentCreationData,
  ShipmentCreationResult,
  TrackingResult,
} from './types';

interface DelhiveryConfig {
  apiKey: string;
  baseUrl: string;
  returnPincode: string;
  returnAddress: string;
  returnCity: string;
  returnState: string;
  returnCountry: string;
  returnName: string;
  returnPhone: string;
}

class DelhiveryService implements IShippingProvider {
  readonly providerName = 'delhivery';

  private config: DelhiveryConfig | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      if (!process.env.DELHIVERY_API_KEY) {
        console.warn('Delhivery API key not configured. Shipping features will not work.');
        return;
      }

      this.config = {
        apiKey: process.env.DELHIVERY_API_KEY.trim(),
        baseUrl: (process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com').trim(),
        returnPincode: process.env.DELHIVERY_RETURN_PINCODE || '400001',
        returnAddress: process.env.DELHIVERY_RETURN_ADDRESS || '',
        returnCity: process.env.DELHIVERY_RETURN_CITY || 'Mumbai',
        returnState: process.env.DELHIVERY_RETURN_STATE || 'Maharashtra',
        returnCountry: process.env.DELHIVERY_RETURN_COUNTRY || 'India',
        returnName: process.env.DELHIVERY_RETURN_NAME || 'Pratigya Medical Store',
        returnPhone: process.env.DELHIVERY_RETURN_PHONE || '9876543210',
      };

      console.log('Delhivery service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Delhivery service:', error);
    }
  }

  async checkServiceability(
    pincode: string,
    _originPincode?: string,
    _weight?: number,
    _cod?: boolean
  ): Promise<{ serviceable: boolean; estimatedDays?: number; error?: string }> {
    if (!this.config) {
      return { serviceable: false, error: 'Delhivery service not configured' };
    }

    try {
      const cleanPincode = pincode.replace(/\D/g, '');
      if (cleanPincode.length !== 6) {
        return { serviceable: false, error: 'Invalid PIN code format' };
      }

      const url = `${this.config.baseUrl}/c/api/pin-codes/json/?filter_codes=${cleanPincode}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.config.apiKey}`,
        },
      });

      const data = await response.json();

      if (data.delivery_codes && data.delivery_codes.length > 0) {
        const pincodeData = data.delivery_codes[0];
        // pin can be number or string depending on API version — coerce both
        const pin = String(pincodeData?.postal_code?.pin ?? '');
        const serviceable = pin === cleanPincode;
        return { serviceable, estimatedDays: serviceable ? 3 : undefined };
      }

      return { serviceable: false };
    } catch (error: any) {
      console.error('Error checking serviceability:', error);
      return { serviceable: false, error: error.message };
    }
  }

  async createShipment(
    data: ShipmentCreationData
  ): Promise<{ success: boolean; result?: ShipmentCreationResult; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'Delhivery service not configured' };
    }

    try {
      const shipmentPayload = {
        shipments: [
          {
            name: data.customerName,
            add: `${data.deliveryAddress.line1}${data.deliveryAddress.line2 ? ', ' + data.deliveryAddress.line2 : ''}`,
            pin: data.deliveryAddress.pincode,
            city: data.deliveryAddress.city,
            state: data.deliveryAddress.state,
            country: data.deliveryAddress.country,
            phone: data.customerPhone,
            order: data.orderNumber,
            payment_mode: data.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
            return_pin: this.config.returnPincode,
            return_city: this.config.returnCity,
            return_phone: this.config.returnPhone,
            return_add: this.config.returnAddress,
            return_state: this.config.returnState,
            return_country: this.config.returnCountry,
            products_desc: data.items.map((i) => `${i.name} x ${i.quantity}`).join(', '),
            hsn_code: '',
            cod_amount: data.paymentMethod === 'cod' ? String(data.codAmount || data.totalValue) : '0',
            order_date: new Date().toISOString().split('T')[0],
            total_amount: data.totalValue.toString(),
            seller_add: this.config.returnAddress,
            seller_name: this.config.returnName,
            seller_inv: data.orderNumber,
            quantity: data.items.reduce((s, i) => s + i.quantity, 0).toString(),
            waybill: '',
            shipment_width: '10',
            shipment_height: '10',
            weight: data.totalWeight.toString(),
            seller_gst_tin: '',
            shipping_mode: 'Surface',
            address_type: 'home',
          },
        ],
        pickup_location: {
          name: this.config.returnName,
          add: this.config.returnAddress,
          city: this.config.returnCity,
          pin_code: this.config.returnPincode,
          country: this.config.returnCountry,
          phone: this.config.returnPhone,
        },
      };

      const formData = new URLSearchParams();
      formData.append('format', 'json');
      formData.append('data', JSON.stringify(shipmentPayload));

      const response = await fetch(`${this.config.baseUrl}/api/cmu/create.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Token ${this.config.apiKey}`,
        },
        body: formData.toString(),
      });

      const raw = await response.json();

      if (raw.success && raw.packages && raw.packages.length > 0) {
        const waybill: string = raw.packages[0].waybill;
        return {
          success: true,
          result: {
            waybill,
            shipmentId: waybill, // Delhivery: shipmentId === waybill
            courierName: 'Delhivery',
            trackingUrl: `https://www.delhivery.com/track/package/${waybill}`,
          },
        };
      }

      const pkgError = raw.packages?.[0]?.error || raw.packages?.[0]?.remarks;
      const errMsg = String(pkgError || raw.rmk || 'Delhivery shipment creation failed');
      const lower = errMsg.toLowerCase();
      let clean = errMsg;
      if (lower.includes('insufficient balance') || lower.includes('manifest charge')) {
        clean = 'Delhivery wallet balance is insufficient. Top up at one.delhivery.com → Billing, then retry. Alternatively use Shiprocket.';
      } else if (lower.includes('pin') || lower.includes('delivery not available')) {
        clean = 'Delhivery does not deliver to this pincode. Try Shiprocket instead.';
      }
      return { success: false, error: clean };
    } catch (error: any) {
      console.error('Error creating Delhivery shipment:', error);
      return { success: false, error: error.message || 'Failed to create shipment' };
    }
  }

  async trackShipment(identifier: string): Promise<TrackingResult | null> {
    if (!this.config) {
      console.error('Delhivery service not configured');
      return null;
    }

    try {
      const url = `${this.config.baseUrl}/api/v1/packages/json/?waybill=${identifier}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.config.apiKey}`,
        },
      });

      const data = await response.json();

      if (data.ShipmentData && data.ShipmentData.length > 0) {
        const shipment = data.ShipmentData[0].Shipment;
        const scans = shipment.Scans || [];
        const status: string = shipment.Status.Status;

        return {
          waybill: shipment.Waybill,
          status,
          mappedStatus: this.mapStatus(status),
          currentLocation: scans.length > 0 ? scans[0].ScanDetail.ScannedLocation : undefined,
          expectedDelivery: shipment.ExpectedDeliveryDate,
          scans: scans.map((scan: any) => ({
            timestamp: scan.ScanDetail.ScanDateTime,
            activity: scan.ScanDetail.Scan,
            location: scan.ScanDetail.ScannedLocation,
            status: scan.ScanDetail.ScanType,
          })),
        };
      }

      return null;
    } catch (error) {
      console.error('Error tracking Delhivery shipment:', error);
      return null;
    }
  }

  async cancelShipment(waybill: string): Promise<{ success: boolean; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'Delhivery service not configured' };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/p/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.config.apiKey}`,
        },
        body: JSON.stringify({ waybill, cancellation: true }),
      });

      const data = await response.json();
      if (data.success) return { success: true };
      return { success: false, error: data.rmk || 'Failed to cancel shipment' };
    } catch (error: any) {
      console.error('Error cancelling Delhivery shipment:', error);
      return { success: false, error: error.message };
    }
  }

  getShippingLabelUrl(waybill: string): string {
    if (!this.config) return '';
    return `${this.config.baseUrl}/api/p/packing_slip?wbns=${waybill}&pdf=true`;
  }

  mapStatus(delhiveryStatus: string): string {
    const statusMap: Record<string, string> = {
      Pending: 'processing',
      Manifested: 'processing',
      Dispatched: 'shipped',
      'In Transit': 'shipped',
      'Out for Delivery': 'shipped',
      'Transit Delay': 'shipped',
      Misrouted: 'shipped',
      Delivered: 'delivered',
      RTO: 'cancelled',
      'RTO Delivered': 'cancelled',
      Cancelled: 'cancelled',
      Lost: 'cancelled',
      Damaged: 'cancelled',
    };
    return statusMap[delhiveryStatus] || 'processing';
  }
}

export const delhiveryService = new DelhiveryService();
