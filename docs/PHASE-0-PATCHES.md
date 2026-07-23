# Phase 0 — manual patches

The strip script handles deletion and rebranding. These four changes need judgement, so they're by hand. Do them before anything else — the first two are shipping-blockers on a platform that handles medical data and payments.

---

## 1. `next.config.js` — CORS is wide open

The repo sends `Access-Control-Allow-Origin: *` on every route, including authenticated ones. Any site can call the API from a logged-in user's browser.

**Replace:**
```js
{ key: 'Access-Control-Allow-Origin', value: '*' },
```

**With** — remove it from the global header block entirely, and handle CORS only on `/api/v1/*` (the mobile surface) in middleware:

```ts
// middleware.ts
const ALLOWED = (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);

if (req.nextUrl.pathname.startsWith('/api/v1')) {
  const origin = req.headers.get('origin');
  if (origin && ALLOWED.includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Vary', 'Origin');
  }
}
```

Native apps don't send an `Origin` header, so this doesn't affect the Expo client.

Also add a CSP while you're in there — `default-src 'self'` plus Cloudinary, the payment gateway and Google Fonts.

---

## 2. `src/lib/auth.ts` — admin role is hardcoded

Currently a single email address is compared against a literal to grant admin. Roles must live in the database, and we need three of them.

**`src/models/User.ts`:**
```ts
role: {
  type: String,
  enum: ['client', 'staff', 'admin'],
  default: 'client',
  index: true,
},
```

**`src/lib/auth.ts`** — replace the hardcoded check in the `jwt` callback:
```ts
async jwt({ token, user }) {
  if (user) {
    await connectDB();
    const dbUser = await User.findOne({ email: user.email }).select('_id role').lean();
    token.id = dbUser?._id?.toString();
    token.role = dbUser?.role ?? 'client';
  }
  return token;
}
```

**Bootstrap the first admin** with a one-off script reading `ADMIN_BOOTSTRAP_EMAIL`, then remove the variable.

**`middleware.ts`** — gate the routes:
- `/admin/*` → `admin` or `staff`
- `/admin/settings`, `/admin/users` → `admin` only

Never trust the JWT role alone for destructive admin actions — re-check against the database in the route handler. A stale token shouldn't be able to delete a product.

---

## 3. `src/models/Product.ts` — pharma fields

Add to the interface and schema. Keep everything already there; medicines still need images, GST, stock and SEO.

```ts
// ---- Pharma ----
salts: [{
  name:     { type: String, required: true, trim: true },
  strength: { type: Number, required: true, min: 0 },
  unit:     { type: String, enum: ['mg','mcg','g','ml','iu','%'], required: true },
}],
form: {
  type: String,
  enum: ['tablet','capsule','syrup','suspension','injection','cream','ointment',
         'gel','drops','inhaler','powder','sachet','spray','patch','other'],
  required: true,
},
compositionKey: { type: String, required: true, index: true },  // from buildCompositionKey()
manufacturer:   { type: String, required: true, trim: true, index: true },
packSize:       { type: Number, required: true, min: 1 },       // 15 tablets, 100 ml
packUnit:       { type: String, required: true },
unitPrice:      { type: Number, required: true, min: 0 },       // price / packSize
mrp:            { type: Number, min: 0 },
prescriptionRequired: { type: Boolean, default: false, index: true },
scheduleClass:  { type: String, enum: ['OTC','H','H1','X','G'], default: 'OTC' },
hsnCode:        { type: String, trim: true },
storageInstructions: String,
usageInstructions:   String,
sideEffects:    [String],
contraindications: [String],
isDiscontinued: { type: Boolean, default: false },
orderCount:     { type: Number, default: 0 },   // rolling, for "most popular"
```

**Indexes:**
```ts
ProductSchema.index({ compositionKey: 1, unitPrice: 1 });   // the Strip query
ProductSchema.index({ compositionKey: 1, isActive: 1, stock: -1 });
```

**Keep `unitPrice` and `compositionKey` derived, never hand-entered.** Add a pre-save hook:
```ts
ProductSchema.pre('save', function (next) {
  if (this.isModified('salts') || this.isModified('form')) {
    this.compositionKey = buildCompositionKey(this.salts, this.form);
  }
  if (this.isModified('price') || this.isModified('packSize')) {
    this.unitPrice = computeUnitPrice(this.price, this.packSize);
  }
  next();
});
```

The CSV importer must go through the model, not `insertMany`, or the hook is skipped and the Strip silently breaks.

---

## 4. Category — pick one representation

`Product.category` is a `String` while a `Category` collection also exists. Two sources of truth for the same thing.

**Decision:** keep the `Category` collection, change `Product.category` to `ObjectId` with a `ref`. Fix this now, before catalogue import — after 3,000 SKUs are loaded it's a migration.

---

## 5. Test harness

There are no tests. On a codebase that moves money, that's not acceptable to inherit. Minimum bar for week 1:

```
npm i -D vitest @vitest/coverage-v8 mongodb-memory-server supertest
```

Cover, in this order:
1. `buildCompositionKey` — aliases, sorting, unit conversion (pure functions, fastest win)
2. `computeUnitPrice` and `rankAlternatives`
3. Checkout total calculation including GST
4. Payment callback — signature verification and idempotency
5. Order status transitions

Wire it into a GitHub Actions workflow on push. Free, and it stops the next six weeks from producing regressions nobody notices until a customer's payment double-charges.
