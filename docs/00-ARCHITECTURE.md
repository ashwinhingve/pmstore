# Architecture

## System

```
                    Cloudflare (DNS, CDN, SSL, WAF — free)
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              Web browser                  Expo Android app
                    │  session cookie           │  bearer token
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Next.js 16 App Router    │
                    │   (Docker, Hetzner VPS)    │
                    │                            │
                    │  RSC pages  │  /api/*      │  ← web, cookie auth
                    │             │  /api/v1/*   │  ← mobile, bearer auth
                    └─────────────┬─────────────┘
                                  │
        ┌──────────┬──────────┬───┴────┬──────────┬──────────┐
        │          │          │        │          │          │
   MongoDB     Atlas      Cloudinary  Razorpay  Brevo      FCM
   Atlas M0    Search     (images)    /Cashfree (email)    (push)
   (free)      (free)     (free)                (free)     (free)
```

Also on the VPS: Umami analytics, cron for backups. GitHub Actions runs scheduled jobs
(refill reminders) so the app process stays stateless.

## Why these choices

**Next.js monolith, not Node + Express.** The brief recommended splitting out an Express
backend. The base repo is a Next.js App Router app with ~60 API routes; splitting would cost
3–4 weeks and remove server-side rendering, which directly contradicts the SEO and
Lighthouse targets in the same brief. The mobile app gets `/api/v1/*` on the same server.

**One Product collection, no Molecule/Composition tables.** Salts are embedded on the product
and a normalized `compositionKey` string does the grouping. Formula search, price comparison
and alternatives are all one indexed query against that key. A normalized three-table design
would be more "correct" and would cost a week of joins for no benefit at pharmacy catalogue
size.

**Atlas Search, not Elasticsearch or Typesense.** It's included on the free M0 tier, needs no
extra service to host or keep in sync, and covers fuzzy matching, autocomplete, faceting and
synonyms. A separate search service would add infrastructure the budget can't carry.

**Self-hosted VPS, not Vercel.** Vercel's free Hobby plan prohibits commercial use, and a
pharmacy taking payments is commercial. Pro is ~₹1,700/month against ~₹400 for a VPS that also
runs staging, analytics and cron. The repo already builds with `output: standalone`.

**Two auth schemes.** NextAuth v4 issues cookie sessions for the web. Native apps can't use
cookies cleanly, so `/api/v1/auth/*` issues bearer tokens against the same User collection and
the same OTP flow. Trying to make NextAuth serve both is where this normally goes wrong.

## Request flows

**Search**
```
input (debounced 200ms) → GET /api/search/suggest
                        → Atlas Search: compound
                            should: fuzzy(name, boost 3)
                            should: fuzzy(salts.name, boost 2)
                            should: text(manufacturer)
                            filter: isActive, !isDiscontinued
                        → top 8 → suggestion list
```

**The Strip**
```
product page (RSC)
  → Product.find({ compositionKey, isActive: true })
      .sort({ unitPrice: 1 }).lean()
  → rankAlternatives(candidates, currentId)
      badges: cheapest | best-rated (≥5 reviews) | most-popular | current
      in-stock first, then unitPrice ascending
  → <Strip /> rendered server-side, no client fetch
```

**Checkout with a prescription**
```
cart → any line prescriptionRequired?
         yes → require attached Prescription (pending or verified)
       POST /api/checkout/create-order
         └─ SERVER re-validates Rx requirement (never trust the client)
         └─ recomputes every price from the DB (never trust cart prices)
         └─ recomputes GST
       → POST /api/payment/initiate  → idempotency key issued
       → gateway → POST /api/payment/callback
         └─ verify signature
         └─ check idempotency key → already processed? return existing order
         └─ mark paid, decrement stock, increment orderCount
         └─ queue confirmation email
```

**Mobile auth**
```
POST /api/v1/auth/otp/request  → email OTP
POST /api/v1/auth/otp/verify   → { accessToken (15m), refreshToken (30d) }
                                  stored in expo-secure-store
any 401 → POST /api/v1/auth/refresh → retry once → else sign out
```

## Trust boundaries

Everything from a client is untrusted, including the app. Specifically:

- **Prices** are always recomputed server-side from the database at order creation. A cart is a
  list of product IDs and quantities, nothing more.
- **Prescription requirement** is enforced in the order-creation handler, not the UI.
- **Roles** are re-read from the database for any destructive admin action. The JWT claim is a
  fast path, not the authority.
- **Stock** decrements only inside the verified payment callback, never optimistically.

## Data integrity rules

`compositionKey` and `unitPrice` are derived in a Mongoose `pre('save')` hook. Any write path
that bypasses `save()` — `insertMany`, `updateMany`, `findOneAndUpdate` without the hook —
silently produces products the Strip can't group. The CSV importer and the bulk price update
both go through the model for this reason. `scripts/backfill-composition.ts` exists to repair
drift; run it after any bulk operation.

## Failure behaviour

| Failure | Behaviour |
|---|---|
| Atlas Search unavailable | Fall back to a regex query on `name` and `salts.name`. Degraded, not down |
| Cloudinary upload fails | Block the action, show a retry. Never create an order with a missing prescription image |
| Payment gateway timeout | Order stays `pending_payment`. Reconciliation script matches gateway records hourly |
| Email delivery fails | Retry with backoff, then log. Never block order creation on email |
| FCM push fails | Silent. Push is never the only channel for anything important |

## Scaling notes

M0 (512 MB) comfortably holds ~5,000 products plus early orders. Move to Atlas Flex when the
database passes ~350 MB or when order volume makes the shared-tier connection limit bite. The
VPS handles this traffic easily; the first real bottleneck will be Cloudinary's free tier
transformation quota, not compute.
