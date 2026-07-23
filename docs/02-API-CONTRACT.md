# API contract

Two surfaces on the same server:

- `/api/*` — the web app. Auth via NextAuth session cookie.
- `/api/v1/*` — the mobile app. Auth via `Authorization: Bearer <accessToken>`.

Shared business logic lives in `src/lib/`. Route handlers are thin: authenticate, validate,
call the lib, format. Never put domain logic in a route file.

## Conventions

Every handler starts with `await connectDB()`. Validate input with a Zod schema from
`src/lib/validations/`. Return errors through `src/lib/utils/errorHandler.ts` — never leak a
raw Mongoose error, and never echo back a database field name the client didn't send.

**Success**
```json
{ "data": { }, "meta": { "page": 1, "limit": 20, "total": 143 } }
```

**Error**
```json
{ "error": { "code": "PRESCRIPTION_REQUIRED", "message": "This order contains prescription medicines.", "fields": { "items": ["6712..."] } } }
```

`message` is shown to the user, so write it in the product voice: plain, active, no apology, no
"Error:" prefix. `code` is what the client branches on.

| Status | Use |
|---|---|
| 400 | Validation failed |
| 401 | Not signed in / token expired |
| 403 | Signed in, not allowed |
| 404 | Not found, or not visible to this user |
| 409 | Conflict — duplicate SKU, stock changed under you |
| 422 | Business rule failed (Rx missing, pincode not serviceable) |
| 429 | Rate limited |

---

## Public

```
GET  /api/products                    list + filter + paginate
GET  /api/products/[slug]             detail
GET  /api/products/[slug]/alternatives  ← the Strip
GET  /api/categories
GET  /api/search                      full results with facets
GET  /api/search/suggest              autocomplete, ≤8, target <150ms
GET  /api/pincode?code=462001         serviceability
```

### `GET /api/products/[slug]/alternatives`

The Strip's data source. Returns every product sharing `compositionKey`, ranked.

```json
{ "data": {
    "composition": "Paracetamol 650 mg",
    "form": "tablet",
    "alternatives": [
      { "_id": "...", "name": "Calpol 650", "slug": "calpol-650",
        "manufacturer": "GSK", "price": 21.90, "mrp": 24.50,
        "packSize": 15, "packUnit": "tablet", "unitPrice": 1.46,
        "stock": 84, "averageRating": 4.2, "totalReviews": 31,
        "badges": ["cheapest"],
        "savings": { "perUnit": 0.57, "perPack": 8.55, "percent": 28 } }
    ] } }
```

`savings` is null for the current product and for anything not cheaper. The client must render
`unitPrice` as the headline number — see `docs/03-DESIGN-SYSTEM.md`.

---

## Authenticated

```
GET    /api/cart                      server cart (merges with local on sign-in)
POST   /api/cart/items
PATCH  /api/cart/items/[id]
DELETE /api/cart/items/[id]

GET    /api/addresses
POST   /api/addresses
PATCH  /api/addresses/[id]
DELETE /api/addresses/[id]

POST   /api/prescriptions             upload; multipart or Cloudinary signed
GET    /api/prescriptions
GET    /api/prescriptions/[id]

POST   /api/checkout/calculate        totals, GST, delivery
POST   /api/checkout/create-order     ← enforces the Rx rule server-side
POST   /api/payment/initiate
POST   /api/payment/callback          gateway → us; verifies signature
POST   /api/payment/confirm-cod

GET    /api/orders
GET    /api/orders/[id]
GET    /api/orders/[id]/invoice
POST   /api/orders/[id]/cancel        only before 'packed'
POST   /api/orders/[id]/reorder       ← one-tap reorder

GET    /api/saved
POST   /api/saved
DELETE /api/saved/[productId]

PATCH  /api/account/preferences       includes refillOptOut
```

### `POST /api/checkout/create-order`

The security-critical route. In order:

1. Load every product fresh from the database by ID. **Ignore all prices sent by the client.**
2. Check stock for each line.
3. If any line has `prescriptionRequired`, require a `prescriptionId` belonging to this user
   with status `pending` or `verified`. Otherwise 422 `PRESCRIPTION_REQUIRED`.
4. Recompute subtotal, GST and delivery server-side.
5. Create the order as `pending_payment`. Do not decrement stock yet.
6. Return the order plus an idempotency key.

### `POST /api/orders/[id]/reorder`

```json
{ "data": {
    "added": [{ "productId": "...", "name": "Dolo 650", "quantity": 1 }],
    "skipped": [{ "name": "Sumo 650", "reason": "out_of_stock" }] } }
```

Reasons: `out_of_stock` · `discontinued` · `price_changed` (added anyway, flagged) ·
`prescription_required` (added, needs a fresh Rx). Always tell the customer what was skipped —
silently dropping a chronic medication from a refill is the worst possible failure here.

---

## Admin

All under `/api/admin/*`. Middleware requires `admin` or `staff`. **The handler re-reads the
role from the database before any write.**

```
GET|POST        /api/admin/products
GET|PATCH|DELETE /api/admin/products/[id]
POST            /api/admin/products/import        CSV → must use .save() per row
GET             /api/admin/products/export
POST            /api/admin/products/bulk-price    admin only
POST            /api/admin/products/bulk-stock

GET             /api/admin/orders
PATCH           /api/admin/orders/[id]/status
POST            /api/admin/orders/draft           order-by-prescription

GET             /api/admin/prescriptions          queue, oldest pending first
POST            /api/admin/prescriptions/[id]/verify
POST            /api/admin/prescriptions/[id]/reject   requires a reason

GET             /api/admin/customers
GET             /api/admin/dashboard
GET|PATCH       /api/admin/settings               admin only
GET|PATCH       /api/admin/users                  admin only
```

Staff may read orders and customers and act on the prescription queue. Staff may not touch
settings, users, prices or bulk operations.

---

## Mobile — `/api/v1/*`

Same domain logic, different auth and thinner payloads. Send only what a screen renders;
mobile data costs the customer money.

```
POST /api/v1/auth/otp/request    { email }
POST /api/v1/auth/otp/verify     { email, otp }  → { accessToken, refreshToken, user }
POST /api/v1/auth/google         { idToken }
POST /api/v1/auth/refresh        { refreshToken } → { accessToken, refreshToken }
POST /api/v1/auth/logout         revokes the refresh token
POST /api/v1/push/register       { token, platform }
```

Access token 15 minutes, refresh token 30 days, rotated on every use. Store both in
`expo-secure-store` — never `AsyncStorage`.

Then mirrors of: `/api/v1/products`, `/products/[slug]`, `/products/[slug]/alternatives`,
`/search`, `/search/suggest`, `/cart`, `/addresses`, `/prescriptions`, `/checkout/*`,
`/payment/*`, `/orders`, `/orders/[id]/reorder`, `/saved`.

Every `/api/v1` response includes `"apiVersion": 1`. When a breaking change is needed, add
`/api/v2` and keep v1 alive for at least 90 days — you cannot force an app update.

---

## Rate limits

Via `src/lib/middleware/rateLimit.ts`, keyed by IP and by user where signed in.

| Endpoint | Limit |
|---|---|
| `auth/otp/request` | 3 per 15 min per email, 10 per hour per IP |
| `auth/*` | 20 per 15 min per IP |
| `search`, `search/suggest` | 60 per minute per IP |
| `prescriptions` upload | 10 per hour per user |
| `checkout/create-order` | 10 per hour per user |
| everything else | 120 per minute per IP |

## Never log

Prescription image URLs · OTP codes · full addresses · phone numbers · payment signatures ·
tokens. Log the user ID and the order ID; that's enough to debug anything.
