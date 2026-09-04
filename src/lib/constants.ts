// Application constants — single source of truth for store identity & contact.
// Content is authoritative from the live store site pratigyamedicalstore.in.
// Do not hardcode brand name, contact details, or currency elsewhere — import from here.

// Full legal/registered name — used in SEO metadata, schema.org, legal pages,
// and transactional email/SMS. Matches the domain pratigyamedicalstore.com.
export const SITE_NAME = "Pratigya Medical Store";
// Short display brand — used everywhere customers read the name (navbar, footer
// heading, logo wordmark, page-title suffix).
export const SITE_SHORT_NAME = "PM Store";
// Brand aliases people search for — fed to schema.org alternateName + SEO keywords
// so Google ties "PM Store medicine"/"PMStore" queries to this entity. Public display
// name is "PM Store" ONLY (client decision, 2026-08-15): the registered name is NOT an
// alias here — it lives only in SITE_NAME → schema legalName + the legal pages.
export const SITE_ALT_NAMES = [
  "PMStore",
  "PM Store Medicine",
  "PM Store Pharmacy",
  "PM Store Bhopal",
  "PM Store Online",
];
// Compliance badge (kept distinct from the marketing slogan below).
export const SITE_TAGLINE = "Government Approved Generic Brand";
// Marketing slogan — logo lockup, hero, footer, PWA manifest.
export const SITE_SLOGAN = "Trusted medicines, generic prices";
export const SITE_DESCRIPTION =
  "PM Store is a trusted Bhopal pharmacy bridging doctors and patients — " +
  "prescription and OTC medicines at generic prices, compared by price per tablet " +
  "and dispensed by trained pharmacists, with free home delivery across Bhopal.";

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

/**
 * Build a click-to-chat WhatsApp URL for the store's support number, optionally
 * pre-filling the first message. Used by the floating button and the per-product
 * / per-comparison "Chat with us" affordances so the number lives in one place.
 */
export function waHref(message?: string): string {
  const base = CONTACT.whatsappHref;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Registered legal identity — single source of truth for the compliance/legal pages.
// Values verified against the store's official documents (Udyam Registration, MP Shops &
// Establishments "Gumasta", and the FDA drug sale licence). This is a RETAIL pharmacy
// (NIC 47721); both Form 20 and Form 21 are retail drug-sale licences — Form 20 for general
// drugs, Form 21 for Schedule C & C1 drugs. Do NOT re-use `registeredMobile` as a public
// support number — public contact is CONTACT above (client decision, 2026-08-15).
export const LEGAL = {
  proprietor: "Pawan Thakur",
  constitution: "Sole Proprietorship",
  udyam: "UDYAM-MP-10-0171529", // Udyam (MSME) registration — Micro enterprise
  gumasta: "BHOP260705SE000490", // MP Shops & Establishments Act, 1958 (lifetime validity)
  drugLicence: {
    form20: "20/1479/28/2020", // retail — general drugs
    form21: "21/1480/28/2020", // retail — Schedule C & C1 drugs
    validTo: "23 October 2030",
    authority: "Food & Drugs Administration, Bhopal (M.P.)",
  },
  pharmacist: {
    name: "Vikas Dhakad",
    qualification: "B.Pharm",
    regNo: "81244", // MP State Pharmacy Council registration
    regValidTo: "31 December 2027",
  },
  gstin: null, // below the GST threshold — render as "Not applicable"
  registeredMobile: "+91 9200555500", // licensed-entity disclosure only, NOT public support
  grievanceOfficer: {
    name: "Pawan Thakur",
    email: CONTACT.email,
    phone: CONTACT.phone,
  },
} as const;

// Value propositions (from the live store)
export const VALUE_PROPS = [
  "Save 60–70% on medicines with generic brands",
  "Free home delivery, no minimum order",
  "30–40% off on pathology services",
  "Order easily over WhatsApp",
  "20+ years of trusted service",
  "Quality medicines, trained pharmacists",
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
export const FREE_SHIPPING_THRESHOLD = 499;
export const STANDARD_SHIPPING_COST = 40;

// PIN codes the store delivers itself (local hand-delivery in Bhopal), bypassing
// the courier partners. Kept as a list so the local zone can grow without code
// changes. 462041 is the shop's own pincode today.
export const LOCAL_DELIVERY_PINCODES: readonly string[] = ["462041"];

/** True when an order's delivery pincode is one the store delivers itself. */
export function isManualDeliveryPincode(postalCode?: string | null): boolean {
  return !!postalCode && LOCAL_DELIVERY_PINCODES.includes(postalCode.trim());
}

// Image sizes
export const IMAGE_SIZES = {
  THUMBNAIL: { width: 200, height: 200 },
  SMALL: { width: 400, height: 400 },
  MEDIUM: { width: 800, height: 800 },
  LARGE: { width: 1200, height: 1200 },
};
