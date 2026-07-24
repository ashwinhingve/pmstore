/**
 * TypeScript contract for the PMStore mobile API.
 * Copied from mobile/README.md and kept in sync with the server types.
 */

/**
 * Standard API response envelope.
 * Every /api/v1/* endpoint returns this shape.
 */
export interface ApiEnvelope<T> {
  apiVersion: 1;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Authenticated user object.
 */
export interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role: 'client' | 'staff' | 'admin';
}

/**
 * Login result: returned by /api/v1/auth/otp/verify.
 * Tokens must be stored in expo-secure-store, never AsyncStorage.
 */
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Token pair: returned by /api/v1/auth/refresh.
 * Both access and refresh tokens are rotated; store the new pair.
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Product card — must lead with unitPrice (price per tablet/ml).
 *
 * CRITICAL RULE: Compare unitPrice, never price.
 * A ₹28 strip of 15 tablets costs more per tablet than a ₹52 strip of 30.
 * UI must show unitPrice as headline with packSize visible next to it.
 */
export interface ProductCard {
  _id: string;
  name: string;
  slug: string;
  manufacturer: string;
  form: string;
  salts: Array<{
    name: string;
    strength: number;
    unit: string;
  }>;
  price: number;
  mrp?: number;
  packSize: number;
  packUnit: string;
  unitPrice: number; // price per tablet/ml — THIS IS THE HEADLINE NUMBER
  stock: number;
  prescriptionRequired: boolean;
  scheduleClass: 'OTC' | 'H' | 'H1' | 'X' | 'G';
  compositionKey: string;
  images: Array<{
    url: string;
  }>;
  averageRating: number;
  totalReviews: number;
}

/**
 * Paginated response wrapper.
 */
export interface Paginated<T> {
  products: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

/**
 * Search result (same shape as web /api/search).
 */
export interface SearchResult {
  products: ProductCard[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  facets?: {
    category?: Array<{ name: string; count: number }>;
    prescriptionRequired?: Array<{ name: string; count: number }>;
    priceRange?: Array<{ name: string; count: number }>;
  };
}

/**
 * Cart item as stored locally in AsyncStorage.
 * Different from the server order line — this is the client's working copy.
 */
export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  quantity: number;
  unitPrice: number;
  price: number;
  prescriptionRequired: boolean;
  scheduleClass: 'OTC' | 'H' | 'H1' | 'X' | 'G';
}

/**
 * Address — used for checkout and stored in the user's account.
 */
export interface Address {
  _id: string;
  type: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
}

/**
 * Order line item.
 */
export interface OrderLineItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  prescriptionRequired: boolean;
}

/**
 * Order — returned by /api/v1/orders/[id].
 */
export interface Order {
  _id: string;
  userId: string;
  email: string;
  items: OrderLineItem[];
  totalAmount: number;
  gstAmount: number;
  discount?: number;
  status: 'placed' | 'confirmed' | 'packed' | 'out-for-delivery' | 'delivered' | 'cancelled';
  paymentMethod: 'card' | 'upi' | 'netbanking' | 'wallet' | 'cod';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  address: Address;
  prescriptionId?: string;
  createdAt: string;
  updatedAt: string;
  tracking?: {
    timestamp: string;
    status: string;
    description: string;
  }[];
}

/**
 * Saved medicine (wishlist).
 */
export interface SavedMedicine {
  _id: string;
  userId: string;
  productId: string;
  product?: ProductCard;
  createdAt: string;
}

/**
 * Prescription — stores uploaded images and verification status.
 * Images are stored on Cloudinary; we only keep the URLs.
 */
export interface Prescription {
  _id: string;
  userId: string;
  orderId?: string;
  status: 'pending' | 'verified' | 'rejected';
  imageUrls: string[];
  rejectionReason?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * FCM push token registration request.
 */
export interface PushRegistrationRequest {
  token: string; // FCM device token
}

/**
 * OTP request/verify request bodies.
 */
export interface OtpRequestBody {
  email: string;
}

export interface OtpVerifyBody {
  email: string;
  otp: string;
}

/**
 * Refresh token request body.
 */
export interface RefreshTokenBody {
  refreshToken: string;
}

/**
 * Reorder request — rebuilds cart from a past order.
 */
export interface ReorderResponse {
  items: CartItem[];
  skipped: Array<{
    name: string;
    reason: 'out-of-stock' | 'discontinued';
  }>;
}
