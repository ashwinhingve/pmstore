import { describe, it, expect } from 'vitest';
import {
  safeJsonLd,
  organizationSchema,
  websiteSchema,
  productSchema,
  breadcrumbSchema,
  faqSchema,
} from './structured-data';

const SITE = 'https://pratigyamedicalstore.com';

describe('safeJsonLd', () => {
  it('escapes characters that could break out of a <script> tag', () => {
    const out = safeJsonLd({ x: '</script><b>&' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c');
    expect(out).toContain('\\u0026');
  });
});

describe('organizationSchema / websiteSchema', () => {
  it('describes a Pharmacy with a stable @id', () => {
    const org = organizationSchema(SITE);
    expect(org['@type']).toBe('Pharmacy');
    expect(org['@id']).toBe(`${SITE}/#organization`);
  });

  it('wires the WebSite SearchAction to the products search', () => {
    const site = websiteSchema(SITE);
    expect(site.potentialAction.target.urlTemplate).toContain('/products?search=');
    expect(site.publisher['@id']).toBe(`${SITE}/#organization`);
  });
});

describe('productSchema', () => {
  const base = { name: 'Dolo 650', slug: 'dolo-650', price: 30, stock: 12 };

  it('emits an INR Offer with in-stock availability', () => {
    const s = productSchema(base, SITE) as any;
    expect(s['@type']).toBe('Product');
    expect(s.offers.priceCurrency).toBe('INR');
    expect(s.offers.price).toBe('30.00');
    expect(s.offers.availability).toBe('https://schema.org/InStock');
    expect(s.url).toBe(`${SITE}/products/dolo-650`);
  });

  it('marks out-of-stock when stock is zero', () => {
    const s = productSchema({ ...base, stock: 0 }, SITE) as any;
    expect(s.offers.availability).toBe('https://schema.org/OutOfStock');
  });

  it('exposes MRP via priceSpecification only when it exceeds the price', () => {
    const withMrp = productSchema({ ...base, mrp: 50 }, SITE) as any;
    expect(withMrp.offers.priceSpecification).toBeDefined();
    const noMrp = productSchema({ ...base, mrp: 30 }, SITE) as any;
    expect(noMrp.offers.priceSpecification).toBeUndefined();
  });

  it('includes aggregateRating only when there are real reviews', () => {
    const rated = productSchema({ ...base, averageRating: 4.5, totalReviews: 8 }, SITE) as any;
    expect(rated.aggregateRating.reviewCount).toBe(8);
    const unrated = productSchema({ ...base, averageRating: 0, totalReviews: 0 }, SITE) as any;
    expect(unrated.aggregateRating).toBeUndefined();
  });
});

describe('breadcrumbSchema', () => {
  it('numbers positions from 1', () => {
    const b = breadcrumbSchema([
      { name: 'Home', url: SITE },
      { name: 'Dolo 650', url: `${SITE}/products/dolo-650` },
    ]);
    expect(b.itemListElement[0].position).toBe(1);
    expect(b.itemListElement[1].position).toBe(2);
    expect(b.itemListElement[1].name).toBe('Dolo 650');
  });
});

describe('faqSchema', () => {
  it('wraps each Q/A as a Question with an accepted Answer', () => {
    const f = faqSchema([{ question: 'Do you deliver?', answer: 'Yes, across MP.' }]);
    expect(f['@type']).toBe('FAQPage');
    expect(f.mainEntity[0]['@type']).toBe('Question');
    expect(f.mainEntity[0].acceptedAnswer.text).toBe('Yes, across MP.');
  });
});
