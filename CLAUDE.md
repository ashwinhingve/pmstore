# CLAUDE.md

Guidance for Claude Code working in this repository. Read this first, every session.

## What this is

PMStore — a pharmacy eCommerce platform for Pratigya Medical Store (India).
Web at `pratigyamedicalstore.com`, plus an Android app. Built by forking the Taptifs
food-eCommerce codebase and replacing the domain layer with pharma.

**Client constraint: very tight budget.** Everything runs on free tiers plus a ~₹400/month
VPS. Do not introduce a paid service without flagging it first.

**Delivery constraint: web live in 6 weeks, app by week 10.** Prefer the simple thing that
works over the complete thing that doesn't ship.

## Commands

```bash
npm run dev            # dev server, localhost:3000
npm run build          # production build (output: standalone)
npm run start          # run the production build
npm run lint
npm run test           # vitest
npm run test:watch
npx tsx scripts/import-products.ts <file.csv>    # catalogue import
npx tsx scripts/backfill-composition.ts          # recompute compositionKey + unitPrice
```

## Architecture in one paragraph

Next.js 16 App Router monolith. MongoDB via Mongoose. NextAuth v4 (JWT strategy) for web
sessions; a separate bearer-token scheme under `/api/v1/*` for the mobile app. Cloudinary for
images, Atlas Search for search, Razorpay/Cashfree for payments, Brevo SMTP for email, FCM for
push. There is **no separate Express backend** — the brief suggested one, we deliberately did not
build one. See `docs/00-ARCHITECTURE.md`.

## Non-negotiable rules

These cause real harm if broken. Do not deviate without asking.

1. **Compare `unitPrice`, never `price`.** A ₹28 strip of 15 tablets costs more per tablet than
   a ₹52 strip of 30. Any UI that shows brands side by side must lead with price per tablet/ml
   and show pack size next to it. Getting this wrong on a pharmacy misleads people about their
   medication costs.

2. **`compositionKey` and `unitPrice` are derived, never hand-entered.** They are computed in a
   Mongoose pre-save hook from `salts`/`form` and `price`/`packSize`. Never use `insertMany` or
   `updateMany` on products — it skips the hook and silently breaks the Strip. Use `save()` or
   `bulkWrite` with explicitly computed values.

3. **Prescription upload is OPTIONAL at checkout (client decision, 2026-08-01).** Any order may
   be placed without attaching a prescription; scheduled (H/H1/X) medicines are verified by the
   pharmacist before delivery instead of being gated at checkout. The old hard block was removed
   from `/api/checkout/create-order` at the client's request — do **not** re-add it without their
   sign-off. (`src/lib/checkout/prescription-guard.ts` still holds the enforcement logic, retained
   and tested, if the pharmacy ever reinstates the gate.)

4. **Never trust the JWT role for destructive admin actions.** Re-read the user's role from the
   database inside the handler. A stale token must not be able to delete products.

5. **No secrets in client components.** Anything under `'use client'` ships to the browser.

6. **Never log prescription image URLs, phone numbers, or full addresses.** Health data.

7. **`--rx` red is for prescription flags only.** Never use it for discounts or sale badges. On a
   pharmacy, red means "this needs a doctor," and diluting that is a safety problem.

## Scope guard — do NOT build these in v1

The original brief listed ~60 features. We cut deliberately. If a task seems to call for one of
these, stop and ask rather than building it:

reviews & ratings · returns/refunds flow · courier API integration (Delhivery/Shiprocket) ·
voice search · coupon UI (backend exists, leave it) · product variants · wholesale portal ·
granular staff permissions · audit-log UI · backup/restore UI · multi-warehouse · loyalty points ·
SMS OTP (needs DLT registration, deferred)

Manual courier status updates and manual refunds are fine at this order volume.

## What we DO build

Search (brand + salt, typo-tolerant) · product page with the Strip · cart · checkout ·
prescription upload · order tracking · account + addresses · **one-tap reorder** ·
**refill reminders** · **order-by-prescription** (staff builds the cart) · **savings counter** ·
admin products/orders/Rx-queue/CSV import-export · Expo Android app.

## Conventions

- TypeScript strict. No `any` in new code — use `unknown` and narrow.
- Server Components by default. `'use client'` only when you need state, effects or handlers.
- API routes: `await connectDB()` first, validate with Zod from `src/lib/validations/`, return
  errors through `src/lib/utils/errorHandler.ts`. Never return a raw Mongoose error.
- Mongoose reads that feed React get `.lean()`. Serialize `_id` to string at the boundary.
- Money is stored in rupees as a `Number`, rounded to 2 decimals at write time. Never format
  currency in a model — that's the UI's job.
- Zustand for client state. The cart persists to `localStorage` under `pmstore-cart`. Auth
  tokens do **not** go in `localStorage`.
- Files: components `PascalCase.tsx`, everything else `kebab-case.ts`.
- Commits: `feat|fix|chore|refactor(scope): message`. One logical change per commit.

## Directory map

```
src/
  app/
    (shop)/          storefront: products, cart, checkout, orders, prescriptions
    (account)/       login, profile, addresses, saved medicines
    (info)/          static pages
    admin/           admin panel — role-gated
    api/             web API routes (session-cookie auth)
    api/v1/          mobile API routes (bearer-token auth)
  components/
    strip/           the Strip — signature component, see docs/03-DESIGN-SYSTEM.md
    products/ cart/ checkout/ orders/ admin/ shared/ ui/
  lib/
    pharma/          composition.ts — compositionKey, unit pricing, ranking
    search/          Atlas Search query builders
    payment/ shipping/ notifications/ cloudinary/ validations/ utils/
  models/            Mongoose schemas
  store/             Zustand
  styles/tokens.css  design tokens
mobile/              Capacitor Android shell — wraps the live site (see SETUP.md §7)
```

## Documentation index

| Read this | When |
|---|---|
| `SETUP.md` | **Running it end to end** — tools, env vars, external APIs, catalogue import, deploy, the app |
| `docs/04-ROADMAP.md` | **Start here each week.** Tasks + acceptance criteria, weeks 1–10 |
| `docs/00-ARCHITECTURE.md` | System design, request flows, why decisions were made |
| `docs/01-DATA-MODEL.md` | Every collection, field, index, derived-value rule |
| `docs/02-API-CONTRACT.md` | Route list, request/response shapes, error format |
| `docs/03-DESIGN-SYSTEM.md` | Tokens, type rules, component specs, copy voice |
| `docs/05-SETUP.md` | Local dev, Atlas, Atlas Search, deployment |
| `docs/06-MOBILE-APP.md` | ⚠️ Superseded (old Expo plan). The app is now a Capacitor wrapper → see below |
| `docs/07-TESTING.md` | What to test and in what order |
| `docs/08-LAUNCH-CHECKLIST.md` | Security, SEO, performance, go-live |
| `docs/10-ANDROID-RELEASE.md` | **Building & shipping the Android app** — preview APK, signing, Play Store submission |
| `docs/PHASE-0-PATCHES.md` | Week 1 manual patches (CORS, RBAC, Product schema) |

Nested `CLAUDE.md` files exist in `src/app/api/`, `src/components/` and `mobile/` with rules
specific to those areas. They apply in addition to this file.

## Working style

- Read `docs/04-ROADMAP.md` for the current week before starting. Work the acceptance criteria.
- Run `npm run lint && npm run test && npm run build` before saying a task is done.
- When a task is ambiguous, pick the simpler interpretation and say which you picked.
- Don't refactor code you weren't asked to touch. This is a 10-week build.
- If you find something genuinely broken outside your task, note it, don't fix it inline.
