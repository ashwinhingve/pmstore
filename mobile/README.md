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

## Client plan (weeks 7–10)

1. **Week 7** — Scaffold with `create-expo-app`, wire SecureStore token storage
   and an axios/fetch interceptor that refreshes on 401 (calls
   `/api/v1/auth/refresh`, retries once, else routes to login). Email-OTP login
   screen.
2. **Week 8** — Home/search (reuse `/api/v1/search`), product page with the
   Strip (per-unit comparison), cart.
3. **Week 9** — Orders, one-tap reorder, prescription upload, FCM push
   (register via `/api/v1/push/register`), deep links.
4. **Week 10** — Polish, offline-friendly caching, Play Store build & submission.

Nothing here should be treated as final until it's built and run against a real
device — this file is the spec, not the implementation.
