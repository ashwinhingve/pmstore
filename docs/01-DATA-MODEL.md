# Data model

MongoDB via Mongoose. Models live in `src/models/`. Every model is registered through
`src/models/index.ts` — import from there, not from the file, so hot reload doesn't
double-register.

Collections carried over from Taptifs and kept: `User`, `Address`, `Order`, `OrderItem`,
`OrderNote`, `CartItem`, `Category`, `Discount`, `Transaction`, `IdempotencyKey`, `Otp`,
`SiteSettings`, `AdminActivity`.

Removed: `WholesaleApplication`, `ProductionSlide`, `TeamMember`, `ReturnRequest`, `Shipment`,
`Review` (v2).

New: `Prescription`, `RefillReminder`, `SavedMedicine`, `SaltSynonym`.

---

## Product

The existing Taptifs product schema stays — images, GST, stock, SEO, tags, specifications are
all still needed. These fields are added.

```ts
salts: [{
  name:     String,   // required — as printed on the pack
  strength: Number,   // required
  unit:     'mg' | 'mcg' | 'g' | 'ml' | 'iu' | '%',
}],
form: 'tablet' | 'capsule' | 'syrup' | 'suspension' | 'injection' | 'cream'
    | 'ointment' | 'gel' | 'drops' | 'inhaler' | 'powder' | 'sachet'
    | 'spray' | 'patch' | 'other',

compositionKey: String,   // DERIVED — buildCompositionKey(salts, form), indexed
manufacturer:   String,   // indexed
packSize:       Number,   // 15 (tablets), 100 (ml)
packUnit:       String,   // 'tablet' | 'ml' | 'g' | 'unit'
unitPrice:      Number,   // DERIVED — price / packSize, 2dp
mrp:            Number,

prescriptionRequired: Boolean,   // indexed
scheduleClass:  'OTC' | 'H' | 'H1' | 'X' | 'G',
hsnCode:        String,

storageInstructions: String,
usageInstructions:   String,
sideEffects:         [String],
contraindications:   [String],

isDiscontinued: Boolean,
orderCount:     Number,   // rolling, powers the "most popular" badge
```

**Changed from Taptifs:** `category` becomes `ObjectId` with `ref: 'Category'`. It was a
`String` while a `Category` collection also existed — two sources of truth. Fix this before
importing the catalogue.

### Derived fields

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

**`insertMany`, `updateMany` and `findOneAndUpdate` skip this hook.** Any bulk path must
compute both values explicitly or use `.save()` per document. Run
`scripts/backfill-composition.ts` after any bulk write.

### Indexes

```ts
{ compositionKey: 1, unitPrice: 1 }              // the Strip
{ compositionKey: 1, isActive: 1, stock: -1 }    // in-stock alternatives
{ category: 1, isActive: 1 }
{ manufacturer: 1 }
{ prescriptionRequired: 1, isActive: 1 }
{ slug: 1 } unique
{ sku: 1 }  unique
```

Drop the old `{ name: 'text', description: 'text', tags: 'text' }` index once Atlas Search is
live — two search systems on one collection is confusion waiting to happen.

---

## Prescription

```ts
userId:      ObjectId → User
orderId:     ObjectId → Order          // optional; set once attached
images:      [{ url, publicId }]       // 1–5, Cloudinary
status:      'pending' | 'verified' | 'rejected' | 'expired'
patientName, doctorName, issueDate
buildCartRequested: Boolean            // "order by prescription" flow
verifiedBy:  ObjectId → User
verifiedAt:  Date
rejectionReason: String
```

Indexes: `{ status: 1, createdAt: 1 }` (admin queue, oldest first),
`{ userId: 1, createdAt: -1 }`.

Indian prescriptions are generally treated as valid for six months from `issueDate`.

---

## User

Add to the Taptifs schema:

```ts
role: 'client' | 'staff' | 'admin'   // indexed, default 'client'
refillOptOut: Boolean                 // default false
pushTokens: [{ token, platform, updatedAt }]   // FCM
```

The old code granted admin by comparing against a hardcoded email address. That is removed.
Roles live here and are re-read from the database for destructive actions.

---

## Order

Carried over. Add:

```ts
prescriptionId: ObjectId → Prescription   // required if any line is Rx
source:         'web' | 'app' | 'staff'   // 'staff' = order-by-prescription
```

`OrderItem` snapshots `name`, `price`, `unitPrice`, `packSize`, `salts` and `manufacturer` at
purchase time. Prices change; an old invoice must still render correctly.

---

## RefillReminder

```ts
userId:       ObjectId → User
orderItemId:  ObjectId → OrderItem   // unique — one reminder per line, ever
productId:    ObjectId → Product
dueAt:        Date                    // deliveredAt + (packSize * qty * 0.85 days)
sentAt:       Date
status:       'scheduled' | 'sent' | 'cancelled'
```

Unique index on `orderItemId`. The cron picks up `status: 'scheduled', dueAt: { $lte: now }`.
Respect `User.refillOptOut` and include an unsubscribe link in every mail.

The depletion estimate assumes one unit per day. It's wrong for a lot of medicines and that's
acceptable — a reminder a few days early is useful, a reminder that never comes is not. Don't
build a dosage engine for this.

---

## SavedMedicine

Replaces the `WishlistItem` stub, which had a model but no API and no UI.

```ts
userId: ObjectId → User
productId: ObjectId → Product
createdAt: Date
```

Compound unique index on `{ userId, productId }`.

---

## SaltSynonym

Feeds the Atlas Search synonym mapping.

```ts
mappingType: 'equivalent'
synonyms: [String]     // ['paracetamol', 'acetaminophen', 'paracetmol']
```

Generated by `scripts/build-search-synonyms.ts` from `SALT_ALIASES` in
`src/lib/pharma/composition.ts` plus a curated list. Regenerate whenever aliases change.

---

## Conventions

- Money is a `Number` in rupees, rounded to 2 decimals at write time. Never format inside a model.
- All timestamps are UTC. Format to IST in the UI, never in the database.
- Soft delete with `isActive: false`. Never hard-delete a product that appears in an order.
- Reads that feed React use `.lean()`. Serialize `_id` to string at the API boundary.
- Never store a Cloudinary URL without its `publicId` — you can't delete the asset later.
