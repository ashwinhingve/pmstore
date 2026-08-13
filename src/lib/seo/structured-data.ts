/**
 * JSON-LD structured-data builders.
 *
 * Pure and DB-free: each function returns a plain schema.org object. The layout
 * and page components serialize them with `safeJsonLd` into a
 * `<script type="application/ld+json">`. Keeping the builders here (not inline in
 * JSX) makes the shapes unit-testable and reusable across pages.
 *
 * Why these types: Pharmacy + WebSite for the site, Product with an Offer for
 * medicine pages (so Google can show price + availability), BreadcrumbList for
 * navigation context, and FAQPage for the info pages (eligible for rich results).
 */

import { SITE_NAME, SITE_SHORT_NAME, CONTACT, SOCIAL_LINKS } from '@/lib/constants';

const ORG_ID = (siteUrl: string) => `${siteUrl}/#organization`;

/** Escape a JSON-LD payload so it can't break out of the <script> tag. */
export function safeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/**
 * The store's entity schema. `name` is the brand people actually search for
 * ("PM Store") so Google ties the query to this site; the registered name is
 * carried as `legalName`/`alternateName`. Full NAP (name/address/phone) +
 * openingHours make it a complete local Pharmacy entity, which is what surfaces
 * the site for the brand query.
 */
export function organizationSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    '@id': ORG_ID(siteUrl),
    name: SITE_SHORT_NAME,
    legalName: SITE_NAME,
    alternateName: SITE_NAME,
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/pmstore-logo.png`,
      width: 512,
      height: 512,
    },
    image: `${siteUrl}/pmstore-logo.png`,
    telephone: CONTACT.phone,
    email: CONTACT.email,
    description:
      'PM Store (Pratigya Medical Store) — online pharmacy in Bhopal. Compare medicine brands by price per tablet, find cheaper equivalents of the same composition, upload a prescription, and get free home delivery.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: CONTACT.address.line1,
      addressLocality: CONTACT.address.city,
      addressRegion: CONTACT.address.state,
      postalCode: CONTACT.address.postalCode,
      addressCountry: 'IN',
    },
    areaServed: CONTACT.address.city,
    openingHours: 'Mo-Su 09:00-21:00',
    sameAs: [SOCIAL_LINKS.whatsapp],
  };
}

export function websiteSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: siteUrl,
    name: SITE_SHORT_NAME,
    alternateName: SITE_NAME,
    description:
      'PM Store — online pharmacy with price-per-tablet comparison, cheaper equivalents, and prescription upload.',
    publisher: { '@id': ORG_ID(siteUrl) },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export interface ProductSchemaInput {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  manufacturer?: string;
  price: number;
  mrp?: number;
  /** In-stock if stock > 0. */
  stock: number;
  averageRating?: number;
  totalReviews?: number;
}

/**
 * Product schema with an Offer. Price is the headline offer price; MRP, when
 * higher, is exposed via priceSpecification so the discount is machine-readable.
 * Availability is derived from stock. AggregateRating is only included when there
 * are real reviews — an empty rating is worse than none for rich results.
 */
export function productSchema(p: ProductSchemaInput, siteUrl: string) {
  const url = `${siteUrl}/products/${p.slug}`;
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    url,
    ...(p.description ? { description: p.description } : {}),
    ...(p.image ? { image: p.image } : {}),
    ...(p.manufacturer ? { brand: { '@type': 'Brand', name: p.manufacturer } } : {}),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'INR',
      price: p.price.toFixed(2),
      availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      ...(p.mrp && p.mrp > p.price
        ? {
            priceSpecification: {
              '@type': 'PriceSpecification',
              price: p.price.toFixed(2),
              priceCurrency: 'INR',
              valueAddedTaxIncluded: true,
            },
          }
        : {}),
    },
  };

  if (p.totalReviews && p.totalReviews > 0 && p.averageRating && p.averageRating > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.averageRating,
      reviewCount: p.totalReviews,
    };
  }

  return schema;
}

export interface Crumb {
  name: string;
  url: string;
}

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqSchema(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  };
}
