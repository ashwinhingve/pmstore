# Launch checklist

Run in full before production. Anything unchecked blocks launch.

## Security

- [ ] `Access-Control-Allow-Origin: *` appears nowhere. CORS scoped to `/api/v1/*` with an allow-list
- [ ] Content-Security-Policy set — `default-src 'self'` plus Cloudinary, gateway, Google Fonts
- [ ] HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy present
- [ ] No hardcoded admin email anywhere. Roles are DB-driven
- [ ] Every destructive admin handler re-reads the role from the database
- [ ] Rate limits live on auth, OTP, search, upload and checkout
- [ ] Every API input validated with Zod. No raw Mongoose errors returned
- [ ] Prescription images use private delivery with signed URLs, not public
- [ ] No PII in logs — no prescription URLs, phone numbers, addresses, OTPs, tokens
- [ ] `.env.local` is gitignored. `ADMIN_BOOTSTRAP_EMAIL` removed after seeding
- [ ] `npm audit` clean of high and critical
- [ ] Atlas network access is IP-restricted, not `0.0.0.0/0`
- [ ] Database user has `readWrite` on one database, not `atlasAdmin`
- [ ] Payment webhook signature verified on every callback
- [ ] Orders cannot be marked paid from a client-side redirect

## Correctness

- [ ] Every active product has a valid `compositionKey` and `unitPrice`
- [ ] The Strip shows every in-stock brand sharing a composition
- [ ] Rx items cannot be ordered without a prescription — verified with curl, not just the UI
- [ ] Payment callback replayed twice creates one order
- [ ] Stock decrements once, never on failure
- [ ] GST totals match to the paisa
- [ ] Reorder reports skipped items

## SEO

- [ ] `generateMetadata` on every route. Unique title and description
- [ ] Canonical URL on every page
- [ ] Open Graph and Twitter cards with a real image
- [ ] `Product` schema with `offers`; `BreadcrumbList`; `Organization`; `FAQPage` on info pages
- [ ] Rich Results Test passes with no errors
- [ ] `sitemap.ts` lists every active product and category
- [ ] `robots.ts` allows the storefront, blocks `/admin` and `/api`
- [ ] 301s from the legacy `.in` URLs
- [ ] SEO-friendly slugs — `/medicine/dolo-650`, not `/product?id=`
- [ ] Google Search Console verified, sitemap submitted

## Performance

- [ ] Lighthouse mobile: performance ≥ 90, accessibility ≥ 95, SEO 100
- [ ] LCP under 2.5 s, CLS under 0.1, INP under 200 ms on product and search pages
- [ ] All images via `next/image` with correct `sizes`. AVIF and WebP enabled
- [ ] Fonts preloaded, `display: swap`, subset to latin
- [ ] Admin bundles dynamically imported and out of the storefront chunk
- [ ] `/_next/static/*` cached for a year at Cloudflare. `/api/*` never cached
- [ ] Search suggest responds under 150 ms warm

## Accessibility

- [ ] Keyboard-only path through search → product → cart → checkout works
- [ ] Visible focus on every interactive element
- [ ] Contrast 4.5:1 text, 3:1 interactive borders
- [ ] Real `<label>` on every input. No placeholder-as-label
- [ ] Alt text on every image
- [ ] Screen reader tested on product page and checkout
- [ ] Layout holds at 200% zoom and at 320px width
- [ ] Touch targets 44px minimum

## Legal and compliance

- [ ] Drug licence number displayed in the footer as required
- [ ] Registered pharmacist details published if required for the client's licence
- [ ] Schedule H, H1 and X products gated behind prescription verification
- [ ] Terms, privacy policy, shipping policy, refund policy published
- [ ] Privacy policy states how prescription images are stored, used and retained
- [ ] Prescription retention period defined and implemented
- [ ] GST details on invoices correct

## Operations

- [ ] Sentry live and receiving a test error
- [ ] Umami tracking
- [ ] Uptime monitoring with an alert to a real phone
- [ ] Daily `mongodump` running, **and a restore verified to a scratch database**
- [ ] Staging behind basic auth on a separate database
- [ ] Cron jobs verified: refill reminders, reconciliation, backup, prescription expiry
- [ ] Admin account seeded; client staff trained; credentials handed over
- [ ] Rollback procedure written and tested

## Go-live

- [ ] DNS cut over, SSL Full (strict) active
- [ ] Real ₹1 payment in production, verified, then refunded
- [ ] Order confirmation email delivered to a real inbox, not spam
- [ ] Every legacy `.in` URL redirects correctly
- [ ] Client can log in, add a product, and change an order status unaided
