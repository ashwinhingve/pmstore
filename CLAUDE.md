# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev        # Start Next.js dev server on http://localhost:3000

# Production
npm run build      # Build for production (output: standalone)
npm run start      # Run production build locally

# Code quality
npm run lint       # ESLint via next lint

# Scripts (run with tsx)
npx tsx scripts/seed-products.ts      # Seed product data
npx tsx scripts/validate-products.ts  # Validate product data
```

There are no automated tests in this project.

## Environment Variables

Required in `.env.local`:
- `MONGODB_URI` — MongoDB Atlas connection string
- `NEXTAUTH_SECRET` — JWT secret for NextAuth
- `NEXTAUTH_URL` — App base URL
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth
- `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` — Payment gateway
- `CLOUDINARY_*` — Image uploads (cloud name, api key, api secret)
- `TWILIO_*` — SMS/WhatsApp notifications
- `SMTP_*` — Email via Nodemailer

## Architecture

This is a Next.js 16 App Router e-commerce app for Tapti Food & Spices (taptifs.com). The database is **MongoDB via Mongoose** (not Supabase — the README is outdated). Payment is via **Cashfree** (not Stripe).

### Route Groups

```
src/app/
  (shop)/          # Product listings, cart, checkout, orders
  (info)/          # Static info pages
  (wholesale)/     # B2B wholesale portal
  admin/           # Admin dashboard (role-gated)
  auth/            # Auth error/signout pages
  api/             # All REST API routes
```

### API Routes (`src/app/api/`)

Key route namespaces: `products`, `orders`, `payment`, `auth`, `checkout`, `addresses`, `categories`, `discount`, `newsletter`, `reviews`, `shipping`, `shipments`, `wholesale`, `admin/*`, `pincode`, `team`, `settings`.

### Data Layer

- **Models** (`src/models/`) — Mongoose schemas: `User`, `Product`, `Order`, `OrderItem`, `CartItem`, `Review`, `Discount`, `Shipment`, `WholesaleApplication`, `Transaction`, `Otp`, `SiteSettings`, `TeamMember`, `ProductionSlide`, etc.
- **DB connection** — `src/lib/mongodb/connection.ts`, exported via `src/lib/mongodb.ts` as `connectDB`. Always call `await connectDB()` in API routes before querying.

### Authentication

NextAuth v4 (`src/lib/auth.ts`) with JWT strategy:
- **Providers**: Google OAuth + Email OTP (hashed with bcrypt, max 3 attempts, single-use)
- **Roles**: `client` | `admin`. Admin role is granted only to `taptiagrofood@gmail.com`.
- Token carries `id`, `email`, `role`. Middleware (`middleware.ts`) injects `x-user-id`, `x-user-role`, `x-user-email` headers for server-side use.
- Protected routes: `/account`, `/orders`, `/profile`, `/wishlist`, `/wholesale/dashboard`. Admin routes: `/admin/*`.

### State Management

Zustand stores (`src/store/`):
- `useCartStore` — persisted to `localStorage` as `tapti-cart-storage`. Cart items keyed by `productId__variantId` (see `cartItemKey` helper). Supports discount application.
- `useAuthStore` — client-side auth state.

### Payment Flow

Cashfree PG (`src/lib/payment/cashfree.ts`):
1. `POST /api/payment/initiate` — creates Cashfree order, returns `paymentSessionId`
2. Cashfree redirects to `POST /api/payment/callback` — verifies payment, updates order status
3. `POST /api/payment/confirm-cod` — for Cash on Delivery orders
4. Idempotency via `IdempotencyKey` model to prevent double-processing

### Shipping

`src/lib/shipping/` — multi-provider shipping with `providerFactory.ts` supporting Delhivery and Shiprocket. `src/lib/queue/shipmentQueue.ts` handles async shipment creation.

### Notifications

`src/lib/notifications/`:
- `email.ts` — Nodemailer
- `sms.ts` — Twilio SMS
- `whatsapp.ts` — Twilio WhatsApp

### Image Storage

Cloudinary for all product/media images via `next-cloudinary` and `src/lib/cloudinary/`. Product images stored as Cloudinary URLs.

### Key Utilities

- `src/lib/utils/errorHandler.ts` — standardized API error responses
- `src/lib/utils/idempotency.ts` — idempotency key management
- `src/lib/utils/circuitBreaker.ts` — external service resilience
- `src/lib/validations/` — Zod schemas for request validation
- `src/lib/gst.ts` — GST calculation helpers

### Type Extensions

`src/types/next-auth.d.ts` extends NextAuth `Session` and `JWT` types to include `id` and `role` fields.
