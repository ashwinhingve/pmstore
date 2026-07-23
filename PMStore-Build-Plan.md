# PMStore — Build Plan (Lean)

**Base:** `github.com/ashwinhingve/taptifs` → new repo `pmstore`
**Web:** pratigyamedicalstore.com · **App:** Android (Expo RN), iOS-ready
**Goal:** production-ready web in 6 weeks, app by week 10, running cost under ₹700/month.

---

## 1. Scope — what we build, what we cut

The brief asks for roughly 60 features. Most pharmacy customers use six. We build those six extremely well, add four things the competition doesn't do, and defer the rest.

### Ship in v1

**Storefront**
- Search — brand name, salt/formula, typo-tolerant, autosuggest
- Product page with the **Strip** (see §4) — every brand with the same salt, priced per tablet
- Cart, checkout, COD + online payment
- Prescription upload for Rx-only medicines
- Order tracking (manual status updates, no courier API yet)
- Account: orders, addresses, saved medicines

**Four things that actually differentiate us**
1. **Reorder in one tap** — chronic patients buy the same 4 medicines every month. Order history → "Order again" → cart filled. This is the single highest-value feature for a pharmacy and almost nobody does it well.
2. **Refill reminders** — we know the order date and the pack size. Email at day 25 of a 30-tablet pack. Costs one cron job, brings the customer back without any ad spend.
3. **Order by prescription** — customer photographs the prescription, staff builds the cart, customer approves and pays. Zero tech cost. Solves the real problem: elderly customers can't spell "Telmisartan."
4. **Savings counter** — "₹4,280 saved this year" on the account page, from generic switches. Same data, framed as a reason to come back.

**Admin**
- Products CRUD + CSV import/export + bulk price/stock update
- Orders + status + prescription verify/reject
- Simple dashboard: today's orders, revenue, low stock
- Two roles: `admin`, `staff`

**App (v1)** — thin client on the same API: search, product + Strip, cart, checkout, orders, reorder, Rx upload, push notifications.

### Cut from v1 (build later if the client asks and pays)

Courier API integration · returns/refunds flow · reviews & ratings · voice search · coupon UI · product variants · wholesale portal · granular staff permissions · audit log UI · backup/restore UI · multi-warehouse · loyalty points

Manual courier updates and manual refunds are completely fine at this order volume. Don't build automation for a problem that doesn't exist yet.

---

## 2. Stack — free tier where it counts

| Need | Choice | Cost |
|---|---|---|
| Hosting | Hetzner CX22 + Dokploy (Docker). Repo already has `output: standalone` | ~₹400/mo |
| CDN / DNS / SSL | Cloudflare free | ₹0 |
| Database | MongoDB Atlas **M0** free — 512 MB, plenty for ~5k SKUs + early orders | ₹0 |
| Search | **Atlas Search** — included on M0 (3 indexes). Fuzzy + autocomplete + synonyms | ₹0 |
| Images | Cloudinary free tier — already wired into the codebase | ₹0 |
| Email | Brevo SMTP, 300/day free → existing Nodemailer, no code change | ₹0 |
| Login | Email OTP + Google OAuth (both already built) | ₹0 |
| Push | Firebase Cloud Messaging | ₹0 |
| Payments | Razorpay or Cashfree — per-transaction only, no monthly fee | ₹0/mo |
| Errors | Sentry free — 5k events/mo | ₹0 |
| Analytics | Umami, self-hosted on the same VPS | ₹0 |
| Cron | GitHub Actions scheduled workflows | ₹0 |
| App builds | Expo EAS free tier | ₹0 |
| Play Store | One-time developer fee | ~₹2,100 once |

**Two warnings:**
- **Do not deploy on Vercel's free Hobby plan.** Its terms prohibit commercial use. A pharmacy taking payments is commercial. It's either Pro (~₹1,700/mo) or the VPS. The VPS is cheaper and gives us cron, Umami and staging on the same box.
- **SMS OTP is deferred.** Twilio plus India's DLT registration is expensive and slow to approve. Email OTP + Google covers launch. Add SMS when the client will fund it.

**Deviation from the brief:** it recommends Node + Express. The repo is a Next.js 16 App Router monolith. Splitting it out would cost 3–4 weeks and break SSR, which kills the SEO requirement in the same brief. We keep the monolith and add `/api/v1/*` for the app.

---

## 3. Data model — keep it to one collection

No separate Molecule/Composition collections. Salts go on the product, and a normalized key does the grouping:

```ts
// Product — pharma fields added to the existing schema
salts: [{ name: 'Paracetamol', strength: 650, unit: 'mg' }],
form: 'tablet',
compositionKey: 'paracetamol-650mg|tablet',   // derived, indexed
manufacturer: 'Micro Labs',
packSize: 15, packUnit: 'tablet',
unitPrice: 1.90,                              // derived: price / packSize
mrp: 30.44,
prescriptionRequired: true,
scheduleClass: 'H',
```

`compositionKey` is the whole trick. Every feature is one query against it:

| Feature | Query |
|---|---|
| Formula search | match `compositionKey` |
| Price comparison | `find({ compositionKey })` sort by `unitPrice` |
| Cheaper alternatives | same, filtered to `unitPrice < current` |
| Better-rated | same, sort by rating with a review-count floor |

**Always compare `unitPrice`, never `price`.** A ₹28 strip of 15 is more expensive than a ₹52 strip of 30. Showing headline price side by side is how these comparison features mislead people, and on a pharmacy that's a real problem, not a UX nitpick.

Plus one new collection, `Prescription`: images, status (`pending`/`verified`/`rejected`), verified-by, reason.

---

## 4. Design direction

Dr Morepen and PlatinumRx both look like Flipkart with pills — dense grids, red discount badges, festival banners. Wrong register. Buying medicine isn't shopping; it's an errand, usually anxious, usually for someone else, usually the same one every month.

So PMStore reads as a **prescription counter**, not a store.

**Palette** — pulled from Indian pharmacy packaging, not from medical-website stock teal:

| | | |
|---|---|---|
| `--ink` | `#16233A` | carton navy — text, surfaces |
| `--paper` | `#FBFAF7` | prescription-pad off-white |
| `--foil` | `#C9CFD6` | blister foil — dividers, edges |
| `--mint` | `#0E8F6E` | apothecary green — in stock, savings, verified |
| `--rx` | `#B23A34` | Schedule-H red — **prescription flags only, never discounts** |

**Type**
- Display: **Bricolage Grotesque** — variable, slightly odd widths, has a spine
- Body: **Public Sans** — plain, official, trustworthy
- Data: **Martian Mono** — *every measured value* renders in mono: `650 mg`, `15 tablets`, `₹1.90/tab`

That last rule is the type signature. Setting strengths and per-unit prices in mono makes the page read like packaging and makes comparison scannable in one pass. All three fonts are free on Google Fonts.

**Signature element — the Strip.** The alternatives module is drawn as a blister pack. Each pill in the strip is a brand with the same salt; the punched-out one is what you're viewing; price per tablet sits under each. Tap a pill to switch brands. It's the price-comparison feature and the visual identity in one component, and it comes straight from the subject's own world.

**Homepage layout:** search-first. No hero banner, no smiling pharmacist. Three doors — search, reorder your last order, upload a prescription. A repeat-purchase product should open on the repeat action.

**Motion:** restrained. The pill-switch on the Strip is the one orchestrated moment. Everything else is quiet.

---

## 5. Timeline

| Week | Deliverable |
|---|---|
| **1** | Phase 0: fork, strip Tapti modules, rebrand, fix CORS + hardcoded admin, RBAC, test harness, staging on VPS. Pharma schema + design system. |
| **2** | Catalogue import pipeline, CSV importer, Atlas Search indexes + salt synonyms, search API + UI |
| **3** | Storefront: home, search results, product page, **the Strip**, category browse |
| **4** | Cart, checkout, payment swap, prescription upload, order confirmation + emails |
| **5** | Account (orders, reorder, saved medicines, savings counter), refill cron, admin panel |
| **6** | SEO (schema.org, sitemap, metadata), performance, security pass, QA → **WEB LIVE** |
| **7–9** | Expo app: API client, search, Strip, cart, checkout, orders, Rx upload, FCM |
| **10** | QA, Play Store submission, launch → **APP LIVE** |

Web is revenue-generating from week 6. That matters for a client who just left their previous developer and needs to see something working.

---

## 6. Blocking questions

Answers needed before week 2. The first one decides the timeline.

1. **Where does salt composition data come from?** Every headline feature depends on knowing the salt for every SKU. Export from the old system, licensed database, or manual entry? If manual and the catalogue is thousands of SKUs, that's unbudgeted data-entry work.
2. Catalogue export (CSV/Excel) with images — how many SKUs?
3. **Does the client own the existing product data, images and content?** Get this in writing given the dispute with the previous developer.
4. Razorpay or Cashfree — existing merchant account?
5. **Play Store:** the old app is under the previous developer's account. New listing = new package name, and all existing installs, ratings and reviews are gone. The client must understand this now.
6. Who verifies prescriptions, and how fast?
7. **Drug licence status**, and which schedules are in scope. Schedule H/H1 cannot be sold without a valid prescription.
8. Delivery area — local only, or shipping across India?

---

## 7. Phase 0 — starting now

Already prepared in this repo:
- `scripts/phase0-strip.sh` — removes wholesale, production slides, team modules, Tapti branding
- `src/models/Product.ts` — pharma fields added
- `src/models/Prescription.ts` — new
- `src/lib/pharma/composition.ts` — key derivation, unit pricing, alternative ranking
- `src/styles/tokens.css` — design system
- `.env.example` — free-tier stack

Run the strip script, then wire the models. Week 1 has no dependency on the client's answers, so it starts immediately.
