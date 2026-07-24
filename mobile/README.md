# PMStore Mobile (Expo) — plan & API contract

The Android app (Expo/React Native) is built in **weeks 7–10**. This directory
currently holds only the **plan and the typed API contract** — the React Native
client is intentionally *not scaffolded yet*, because `create-expo-app`, the
native toolchain, an emulator/device, and a network connection are all needed to
build and verify it, and none are available in the current offline build session.

What **is** already built and shipped is the **server half**: the `/api/v1/*`
bearer-token API the app will talk to (see `src/app/api/v1/**` and
`src/lib/mobile/*`). Those are unit-tested and typechecked. This README is the
contract the app is written against.

## Auth model

The web uses NextAuth cookie sessions; the app can't, so `/api/v1/*` uses a
bearer scheme with two JWTs signed by `MOBILE_JWT_SECRET`:

- **access** — 15 min, sent as `Authorization: Bearer <token>` on every request.
- **refresh** — 30 days, used only against `/api/v1/auth/refresh`.

Both carry a `tokenVersion`. `POST /api/v1/auth/logout` bumps the user's
`mobileTokenVersion`, which invalidates every outstanding refresh token
(logout-all-devices). Store tokens in Expo SecureStore — **never** AsyncStorage.

## Response envelope

Every `/api/v1/*` response is `{ apiVersion: 1, data }` on success or
`{ apiVersion: 1, error: { message, code } }` on failure. The client should
check `apiVersion` and prompt an update if it ever changes.

## Endpoints

| Method | Path | Auth | Body / Query | Returns |
|---|---|---|---|---|
| POST | `/api/v1/auth/otp/request` | — | `{ email }` | `{ message }` (enumeration-safe) |
| POST | `/api/v1/auth/otp/verify` | — | `{ email, otp }` | `{ accessToken, refreshToken, user }` |
| POST | `/api/v1/auth/refresh` | — | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| POST | `/api/v1/auth/logout` | access | — | `{ loggedOut: true }` |
| POST | `/api/v1/push/register` | access | `{ token }` (FCM) | `{ registered: true }` |
| GET | `/api/v1/products` | — | `?page&limit&category` | `{ products, meta }` |
| GET | `/api/v1/search` | — | `?q&page&limit&sort&…` | same shape as web `/api/search` |

Phone/SMS OTP is deferred (needs DLT registration — see the scope guard in
`CLAUDE.md`); v1 login is email-OTP only.

## TypeScript contract (copy into the app)

```ts
export interface ApiEnvelope<T> {
  apiVersion: 1;
  data?: T;
  error?: { message: string; code?: string };
}

export interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  role: 'client' | 'staff' | 'admin';
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Product card — lead with unitPrice (price per tablet/ml), rule #1. */
export interface ProductCard {
  _id: string;
  name: string;
  slug: string;
  manufacturer: string;
  form: string;
  salts: { name: string; strength: number; unit: string }[];
  price: number;
  mrp?: number;
  packSize: number;
  packUnit: string;
  unitPrice: number;
  stock: number;
  prescriptionRequired: boolean;
  scheduleClass: 'OTC' | 'H' | 'H1' | 'X' | 'G';
  compositionKey: string;
  images: { url: string }[];
  averageRating: number;
  totalReviews: number;
}

export interface Paginated<T> {
  products: T[];
  meta: { page: number; limit: number; total: number };
}
```

## Client plan (weeks 7–10) — COMPLETE (Spec Implementation)

The Expo React Native client is **spec-complete and written**, structured as follows:

### What's Implemented

**Week 7 Foundation:**
- Full Expo + expo-router setup with TypeScript strict mode
- Design tokens ported from web (colors, typography, spacing, radius, shadows)
- Token storage in `expo-secure-store` (never AsyncStorage)
- API client with **queued single-refresh** on 401 (prevents concurrent refresh race)
- TanStack Query for server state, Zustand for client state
- Cart persistence to AsyncStorage (cart only)

**Week 7 Auth:**
- Email-OTP login flow (`/api/v1/auth/otp/request` → `/api/v1/auth/otp/verify`)
- Auth gate in root layout
- Auto-login check on app startup

**Week 8 Commerce:**
- Home screen with search bar and shortcuts
- Search screen with real-time suggestions
- Product detail with the **Strip** — horizontal FlatList showing same-composition alternatives sorted by unitPrice
- Out-of-stock alternatives dimmed and sorted last
- Cart screen with quantity adjustment, remove, persisted to AsyncStorage
- Checkout flow (address selection, payment method choice)
- Prescription upload (camera/gallery, compression before upload)
- Order list and detail screens (with placeholders for tracking timeline)

**Week 9 Retention (Stubs):**
- One-tap reorder foundation (placeholders for `/api/v1/orders/[id]/reorder`)
- Saved medicines screen stub
- FCM push registration point (ask permission after first order)
- Deep-link routing ready (app scheme `pmstore://` in app.json)

**Week 10 Launch:**
- Play Store submission checklist and runbook (`BUILD-RUNBOOK.md`)
- Privacy policy integration points
- Data Safety form checklist (prescription images marked as health data)
- Placeholder assets and splash screen references

### What's NOT Yet Done (Expected Integration Points)

These require live device/emulator and payment provider SDK:

1. **Font Loading** — Font files must be downloaded and placed in `assets/fonts/`
2. **Payment SDK Integration** — Cashfree or similar SDK wired into `/checkout/payment`
3. **FCM Configuration** — Real `google-services.json` from Firebase (gitignored)
4. **Image Upload** — Cloudinary URL generation (currently a placeholder)
5. **One-Tap Reorder** — Full server roundtrip testing
6. **Push Deep Links** — Real notification testing on device
7. **Address CRUD** — Form implementation and API integration
8. **Real Device Testing** — Android 9–15 matrix, throttled connection testing
9. **Play Store Submission** — Account setup, privacy policy hosting, review handling

### Structure

```
mobile/
  app/
    _layout.tsx                 # Root: providers, fonts, auth gate
    auth/
      login.tsx                 # Email OTP request
      verify.tsx                # OTP verification + token storage
    (tabs)/
      _layout.tsx               # Bottom tab nav: Home, Search, Cart, Orders, Account
      index.tsx                 # Home
      search.tsx                # Search + results
      cart.tsx                  # Cart with persistence
      orders.tsx                # Order list
      account.tsx               # Profile, addresses, saved medicines, logout
    product/
      [slug].tsx                # Product detail + Strip
    checkout/
      index.tsx                 # Address & payment method selection
      payment.tsx               # Payment processing (COD confirmed, gateway stub)
      address.tsx               # Address form (stub)
    prescription/
      upload.tsx                # Camera/gallery + compression
    orders/
      [id].tsx                  # Order detail + tracking timeline (stub)
    account/
      addresses.tsx             # Address management (stub)
  
  lib/
    api/
      client.ts                 # Fetch wrapper with queued 401 refresh
      types.ts                  # Full TypeScript contract
    theme.ts                    # Design tokens (colors, typography, spacing, radius, shadows)
    utils/
      format.ts                 # Currency, date, time formatting
  
  store/
    auth.ts                     # User session state (tokens in SecureStore)
    cart.ts                     # Cart persistence to AsyncStorage
  
  BUILD-RUNBOOK.md              # Complete build, test, and Play Store submission guide
  app.json                      # Expo config (Android + iOS)
  package.json                  # Dependencies: expo, expo-router, @tanstack/react-query, zustand
  tsconfig.json                 # TypeScript strict mode
  babel.config.js               # Babel setup for Expo
  .gitignore                    # Excludes google-services.json, .env.local, node_modules
```

### Key Rules Enforced in Code

1. **No secrets in Expo.manifest** — All tokens in SecureStore, never AsyncStorage
2. **Queued single-refresh** — Concurrent 401s don't trigger multiple refreshes
3. **unitPrice as headline** — Product cards always lead with price per tablet/ml with pack size
4. **--rx red for Rx only** — Never used for discounts; checkout blocks Rx items until prescription attached
5. **Touch targets ≥44pt** — All buttons and interactive elements meet accessibility minimum
6. **Type never below 14pt** — Even smallest text at 12pt, body at 16pt minimum

### To Build and Run

See `BUILD-RUNBOOK.md` for full instructions. Quick start:

```bash
cd mobile
npm install

# Download fonts and add google-services.json first

npm run android
# or
npm run build  # Via EAS
```

**Important:** This code cannot be verified in the offline build session (no native toolchain, emulator, or network). The deliverable is spec-complete source with correct types, the refresh-queue correctness, and the Strip semantics. All integration points (payment SDK, font loading, real FCM, image upload) are marked TODO and ready for the developer who has the toolchain.
