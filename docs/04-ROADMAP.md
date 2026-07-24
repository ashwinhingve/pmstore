# Roadmap — weeks 1 to 10

Each week has a goal, a task list, and acceptance criteria. A week is done when every
acceptance criterion passes, `npm run lint && npm run test && npm run build` is clean, and the
staging deploy works.

Weeks 1–6 ship the website. Weeks 7–10 ship the Android app. Web goes live at the end of week 6
so the client has a revenue-generating property while the app is built.

**Dependency warning:** weeks 2 onward assume the client has supplied a catalogue export
including salt composition per SKU. If that data isn't available, weeks 2–3 stall regardless of
how fast the code goes. See `docs/05-SETUP.md` § catalogue import for the fallback.

---

## Week 1 — Foundation

**Goal:** a stripped, rebranded, secured codebase running on staging with the pharma schema and
design tokens in place.

### Tasks

1. Fork and reset history
   ```bash
   git clone https://github.com/ashwinhingve/taptifs.git pmstore
   cd pmstore && rm -rf .git && git init && git add -A && git commit -m "chore: fork from taptifs"
   ```
2. Run `bash scripts/phase0-strip.sh`. Review `git diff` before committing.
3. Apply every patch in `docs/PHASE-0-PATCHES.md`:
   - Remove `Access-Control-Allow-Origin: *` from `next.config.js`; scope CORS to `/api/v1/*`
     with an origin allow-list in `middleware.ts`
   - Add a Content-Security-Policy header
   - Replace the hardcoded admin email in `src/lib/auth.ts` with a DB-driven role lookup
   - Add `role: 'client' | 'staff' | 'admin'` to the User model; write `scripts/bootstrap-admin.ts`
   - Gate `/admin/*` in middleware; `/admin/settings` and `/admin/users` are admin-only
4. Extend `src/models/Product.ts` with the pharma fields (`docs/01-DATA-MODEL.md`). Add the
   pre-save hook that derives `compositionKey` and `unitPrice`. Add the two compound indexes.
5. Change `Product.category` from `String` to `ObjectId` with `ref: 'Category'`. Do this now —
   after import it becomes a migration.
6. Add `src/lib/pharma/composition.ts` and `src/models/Prescription.ts` (both supplied).
7. Add `src/styles/tokens.css`, import it in the root layout, wire the three Google fonts via
   `next/font`.
8. Test harness: `npm i -D vitest @vitest/coverage-v8 mongodb-memory-server`. Write tests for
   `buildCompositionKey`, `computeUnitPrice`, `rankAlternatives`. Add
   `.github/workflows/ci.yml` running lint + test + build on push.
9. Swap the payment gateway if the client uses Razorpay — new adapter in `src/lib/payment/`,
   keep the existing idempotency and callback-verification pattern.
10. Provision infra: Hetzner CX22 + Dokploy, Atlas M0, Cloudinary, Brevo, Cloudflare DNS. Deploy
    staging at `staging.pratigyamedicalstore.com` behind HTTP basic auth.

### Acceptance criteria

- [ ] No occurrence of `Tapti`, `taptifs` or the old admin email anywhere in `src/`
- [ ] `Access-Control-Allow-Origin: *` appears nowhere; CSP header present on all responses
- [ ] A `client`-role user gets 403 on every `/admin` route and every admin API route
- [ ] `buildCompositionKey([{name:'Acetaminophen',strength:650,unit:'mg'}],'tablet')`
      returns `paracetamol-650mg|tablet`
- [ ] Saving a product with `price: 30.5, packSize: 15` sets `unitPrice` to `2.03`
- [ ] CI green on push
- [ ] Staging reachable over HTTPS

---

## Week 2 — Catalogue and search

**Goal:** real products in the database, findable by brand name and by salt, with typos.

### Tasks

1. `scripts/import-products.ts` — CSV importer. Streams the file, validates each row with Zod,
   maps salt strings to the `salts` array, calls `.save()` per document so the hook runs, writes
   a reject file for bad rows. Must be idempotent on `sku`.
2. `templates/product-import-template.csv` is the contract. If the client's export doesn't
   match, write a mapping layer — do not change the template.
3. Categories: seed from the client's category list, resolve names to ObjectIds during import.
4. Create the Atlas Search index from `scripts/atlas-search-index.json`.
5. Seed the `salt_synonyms` collection (paracetamol/acetaminophen, etc.) from `SALT_ALIASES`
   plus a `scripts/build-search-synonyms.ts` generator.
6. `src/lib/search/query.ts` — Atlas Search `compound` query:
   - `should`: fuzzy text on `name` (maxEdits 1–2 by term length), boosted
   - `should`: fuzzy text on `salts.name`
   - `should`: text on `manufacturer`
   - `filter`: `isActive: true`, `isDiscontinued: false`
7. `GET /api/search` — results with facets (category, prescriptionRequired, price band).
8. `GET /api/search/suggest` — autocomplete, ≤8 results, under 150 ms.
9. Search UI: header search bar, debounced 200 ms, keyboard navigable suggestions, recent
   searches in `localStorage`.
10. Search results page with filters and pagination.

### Acceptance criteria

- [ ] Full catalogue imported; row count matches source minus a logged reject file
- [ ] Every product has a non-empty `compositionKey` and a correct `unitPrice`
- [ ] Searching `dolo` returns Dolo 650
- [ ] Searching `paracetmol` (typo) returns paracetamol products
- [ ] Searching `paracetamol 650` returns Dolo, Calpol, Crocin and every other 650 mg brand
- [ ] Suggest endpoint responds in under 150 ms warm
- [ ] Search is keyboard-operable end to end

---

## Week 3 — Storefront and the Strip

**Goal:** a customer can find a medicine, understand what it is, and see every cheaper equivalent.

### Tasks

1. Design system pass: implement tokens, type scale, and the base components in
   `docs/03-DESIGN-SYSTEM.md` — `Button`, `Badge`, `PriceBlock`, `RxBadge`, `ProductCard`,
   `EmptyState`.
2. Home page — search-first. Three doors: search, "order again" (last order, if signed in),
   "upload prescription". No hero banner.
3. Category browse + listing pages.
4. Product detail page: images, composition in mono, manufacturer, pack size, price block,
   Rx badge, usage/storage/side-effects accordions, stock state.
5. **The Strip** — `src/components/strip/Strip.tsx`. Server-fetches same-`compositionKey`
   products, ranks with `rankAlternatives`, renders as a blister pack. Badges for cheapest,
   top-rated, most-popular. Out-of-stock shown but dimmed and sorted last. Clicking a pill
   navigates to that product.
6. `GET /api/products/[slug]/alternatives`.
7. Saved medicines (the wishlist model is a stub — build the API and UI).
8. Skeleton loading states, empty states, 404.

### Acceptance criteria

- [ ] Product page LCP under 2.0 s on staging, throttled to Fast 3G
- [ ] Strip shows every in-stock product sharing the composition, sorted by `unitPrice` ascending
- [ ] Strip leads with price per tablet; pack size is always visible next to it
- [ ] Out-of-stock alternatives are visible but clearly unavailable and sorted last
- [ ] Rx-only products show the Schedule badge above the fold
- [ ] Every interactive element has a visible keyboard focus state
- [ ] Layout holds at 320 px width

---

## Week 4 — Cart, checkout, prescriptions

**Goal:** a customer can pay, including for prescription medicines.

### Tasks

1. Cart page — quantity, remove, per-line and order totals, GST breakdown, free-delivery
   threshold. Reuse `useCartStore`, rename the storage key.
2. Cart flags Rx items and blocks checkout until a prescription is attached.
3. Checkout: address select/create, delivery slot or pincode serviceability, payment method.
4. Prescription upload — up to 5 images to Cloudinary, client-side compression before upload
   (Cloudinary free tier is not generous), preview, remove.
5. **Server-side Rx enforcement** in `POST /api/checkout/create-order`: if any line has
   `prescriptionRequired`, require a linked `Prescription` in `pending` or `verified`. Reject
   otherwise. Do not rely on the UI.
6. Payment: initiate → gateway → callback → verify signature → mark paid → decrement stock →
   increment `orderCount`. Preserve the existing idempotency-key handling.
7. COD flow.
8. Order confirmation page + email via Brevo. Order-placed and status-change templates.
9. Order tracking page with a manual status timeline (placed → confirmed → packed → out for
   delivery → delivered).

### Acceptance criteria

- [ ] Placing an order with an Rx item and no prescription returns 400 from the API when called
      directly with curl, not just blocked in the UI
- [ ] Replaying the payment callback twice creates exactly one paid order
- [ ] Stock decrements once per order, never on a failed payment
- [ ] GST totals match `src/lib/gst.ts` to the paisa
- [ ] Confirmation email delivers within 60 seconds
- [ ] Full checkout works on a 360 px viewport

---

## Week 5 — Account, retention features, admin

**Goal:** repeat customers come back on their own, and the client can run the shop.

### Tasks

1. Account: order history, order detail, addresses, saved medicines, profile.
2. **One-tap reorder** — `POST /api/orders/[id]/reorder`. Rebuilds the cart from a past order,
   skipping items now out of stock or discontinued, and tells the customer what was skipped.
   This is the highest-value feature in the build; make it feel instant.
3. **Refill reminders** — `scripts/send-refill-reminders.ts`, run by a GitHub Actions cron.
   For each delivered order, estimate depletion from `packSize` and quantity, email at ~85%
   consumed. One reminder per order line, ever. Unsubscribe link required.
4. **Savings counter** — on the account page, sum `(mrp - price) * qty` across delivered orders
   for the current year. One line, no chart.
5. **Order by prescription** — customer uploads an Rx with `buildCartRequested: true`; it lands
   in the admin queue; staff builds a draft order; customer gets an email with a link to review
   and pay.
6. Admin: dashboard (today's orders, revenue, low stock, pending prescriptions), product CRUD,
   order list + status updates, prescription verify/reject queue, customer list.
7. Admin CSV import/export, bulk price update, bulk stock update. Imports must go through the
   model so the derive hook runs.
8. Staff role: can see orders and prescriptions, cannot change settings, users or prices.

### Acceptance criteria

- [ ] Reorder from a 4-item past order fills the cart in under 1 second and names any skipped item
- [ ] Refill cron sends exactly one reminder per line and never repeats
- [ ] Unsubscribing stops all reminder mail for that user
- [ ] Prescription approve/reject notifies the customer by email
- [ ] Bulk price update on 500 rows recomputes every `unitPrice`
- [ ] A `staff` user gets 403 on settings, users and price endpoints
- [ ] CSV export re-imports cleanly with no data loss

---

## Week 6 — SEO, performance, security, launch

**Goal:** live on the production domain.

### Tasks

1. Metadata: per-page `generateMetadata`, canonical URLs, Open Graph, Twitter cards.
2. Structured data: `Product` (with `offers` and `aggregateRating` where present),
   `BreadcrumbList`, `Organization`, `FAQPage` on info pages.
3. `sitemap.ts` (products, categories, static) and `robots.ts`.
4. SEO-friendly URLs: `/medicine/[slug]`, `/category/[slug]`. 301 the legacy `.in` URLs.
5. Performance: `next/image` everywhere with correct `sizes`, font `display: swap` and preload,
   dynamic imports for admin chunks, cache headers, Cloudflare rules.
6. Security pass: full run of `docs/08-LAUNCH-CHECKLIST.md`. Rate-limit auth, OTP, search and
   upload endpoints. Verify no PII in logs.
7. Sentry, Umami, uptime monitoring. Automated `mongodump` to the VPS with 7-day retention.
8. Legal pages: terms, privacy, shipping, refund, drug-licence disclosure.
9. Full manual QA on real Android and iOS browsers.
10. Production cutover: DNS, SSL, seed admin, smoke test a real ₹1 payment, then refund it.

### Acceptance criteria

- [ ] Lighthouse mobile: performance ≥ 90, accessibility ≥ 95, SEO 100
- [ ] Core Web Vitals in the green on the product page and search results
- [ ] Rich Results Test validates Product and Breadcrumb schema
- [ ] Sitemap lists every active product
- [ ] `npm audit` shows no high or critical vulnerabilities
- [ ] A real payment succeeds end to end in production
- [ ] Database backup verified by restoring to a scratch database

**→ Website live.**

---

## Week 7 — Mobile foundation

**Goal:** the app runs on a device, signs in, and searches.

1. `npx create-expo-app mobile --template` with expo-router and TypeScript.
2. `/api/v1/auth/*` — bearer tokens with refresh. Access 15 min, refresh 30 days in
   `expo-secure-store`. Never `AsyncStorage` for tokens.
3. Typed API client with automatic refresh-on-401 and a single retry.
4. Design tokens ported to the RN theme; the three fonts via `expo-font`.
5. Navigation shell: Home, Search, Cart, Orders, Account.
6. Login (email OTP + Google), search screen with suggestions.

**Done when:** a real Android device can sign in, search, and stay signed in across restarts.

---

## Week 8 — Mobile commerce

1. Product detail with the Strip adapted to a horizontal scroll.
2. Cart with offline persistence.
3. Checkout: addresses, payment gateway SDK, COD.
4. Prescription upload from camera or gallery, compressed before upload.
5. Order list, order detail, tracking timeline.

**Done when:** a full order can be placed from the app, COD and online.

> **Status:** server endpoints built + verified (`/api/v1/products/[slug]`, `/alternatives`,
> `/checkout/create-order` with Rx enforcement, `/payment/initiate`, `/payment/confirm-cod`,
> `/orders`, `/orders/[id]`, `/prescriptions`). Client screens written in `mobile/` but not yet
> run on a device (payment-SDK wiring is the remaining integration point).

---

## Week 9 — Mobile retention and polish

1. One-tap reorder from order history.
2. Saved medicines.
3. FCM push: order status, refill reminders, prescription verified. Ask permission at a moment
   that makes sense, not on first launch.
4. Deep links from email and push into the right screen.
5. Empty states, error states, offline banner, skeleton loaders.
6. App icon, splash, Play Store listing assets.

**Done when:** push arrives on a real device and deep links open the correct screen.

> **Status:** server ready — `/api/v1/orders/[id]/reorder`, `/api/v1/saved-medicines`, and FCM
> sending (`src/lib/notifications/fcm.ts`) wired into order-status and refill flows. Client
> reorder/saved/push/deep-link screens written in `mobile/`; needs `google-services.json` and a
> device to verify push + deep links.

---

## Week 10 — QA and launch

1. Device matrix: Android 9 through 15, low-end and flagship, small and large screens.
2. Load test the API at expected peak; fix the slowest three queries.
3. Play Store: privacy policy, data safety form, content rating, health-app declarations.
4. Submit for review. Budget 3–7 days and expect at least one rejection round on the
   pharmacy/health category.
5. Production monitoring, crash reporting, alert thresholds.
6. Hand over: admin training for the client's staff, runbook, credentials transfer.

**Done when:** the app is published to the Play Store and the client owns the listing.

> **Status:** device matrix, load test, and Play Store submission are all on-device / live-account
> work that cannot be done in this build session. Checklist and hand-off steps are in
> `mobile/PLAY-STORE.md` and `mobile/BUILD-RUNBOOK.md`.

**→ App live.**

---

## Buffer and cut order

There is no slack in this plan. If a week slips, cut in this order rather than extending:

1. Savings counter (week 5)
2. Order-by-prescription (week 5) — can launch as an email address instead
3. Refill reminders (week 5)
4. Category browse pages (week 3) — search covers it
5. Delivery slots (week 4) — flat delivery instead

Never cut: Rx server-side enforcement, payment idempotency, RBAC, the Strip.
