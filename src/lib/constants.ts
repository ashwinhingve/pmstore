// Application constants — single source of truth for store identity & contact.
// Content is authoritative from the live store site pratigyamedicalstore.in.
// Do not hardcode brand name, contact details, or currency elsewhere — import from here.

// Full legal/registered name — used in SEO metadata, schema.org, legal pages,
// and transactional email/SMS. Matches the domain pratigyamedicalstore.com.
export const SITE_NAME = "Pratigya Medical Store";
// Short display brand — used everywhere customers read the name (navbar, footer
// heading, logo wordmark, page-title suffix).
export const SITE_SHORT_NAME = "PM Store";
// Compliance badge (kept distinct from the marketing slogan below).
export const SITE_TAGLINE = "Government Approved Generic Brand";
// Marketing slogan — logo lockup, hero, footer, PWA manifest.
export const SITE_SLOGAN = "Genuine medicines, generic prices";
export const SITE_DESCRIPTION =
  "Pratigya Medical Store is a trusted pharmacy bridging doctors and patients — " +
  "genuine prescription and OTC medicines at generic prices, dispensed by trained " +
  "pharmacists with free home delivery across Bhopal.";

// Public site domain (override with NEXT_PUBLIC_SITE_URL in production)
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pratigyamedicalstore.com";

// Contact — one shop, Bhopal. Never log phone/email/address (health data rule).
export const CONTACT = {
  phone: "+91 9755550126",
  phoneHref: "tel:+919755550126",
  whatsapp: "+91 9755550126",
  whatsappHref: "https://wa.me/919755550126",
  email: "pmstoremedicine@gmail.com",
  emailHref: "mailto:pmstoremedicine@gmail.com",
  address: {
    line1: "S 2 Vikash Kunj",
    city: "Bhopal",
    state: "Madhya Pradesh",
    postalCode: "462041",
    country: "India",
  },
  addressFull: "S 2 Vikash Kunj, Bhopal, Madhya Pradesh — 462041",
  hours: "Open Mon–Sun, 9:00 AM – 9:00 PM",
} as const;

// Backwards-compatible flat aliases (some call sites want a single value)
export const CONTACT_EMAIL = CONTACT.email;
export const CONTACT_PHONE = CONTACT.phone;

// Value propositions (from the live store)
export const VALUE_PROPS = [
  "Save 60–70% on medicines with generic brands",
  "Free home delivery, no minimum order",
  "30–40% off on pathology services",
  "Order easily over WhatsApp",
  "20+ years of trusted service",
  "Genuine medicines, trained pharmacists",
] as const;

// Social — only channels we actually have. Add handles here when confirmed.
export const SOCIAL_LINKS = {
  whatsapp: CONTACT.whatsappHref,
} as const;

// Currency — India, rupees.
export const CURRENCY = "INR";
export const CURRENCY_SYMBOL = "₹";
export const CURRENCY_LOCALE = "en-IN";

// Order + payment status enums
export const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export const PAYMENT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;

// Pagination
export const PRODUCTS_PER_PAGE = 12;

// Shipping (rupees)
export const FREE_SHIPPING_THRESHOLD = 500;
export const STANDARD_SHIPPING_COST = 40;

// Image sizes
export const IMAGE_SIZES = {
  THUMBNAIL: { width: 200, height: 200 },
  SMALL: { width: 400, height: 400 },
  MEDIUM: { width: 800, height: 800 },
  LARGE: { width: 1200, height: 1200 },
};
