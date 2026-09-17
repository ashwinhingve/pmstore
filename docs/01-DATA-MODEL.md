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
    | 'spray' | 'patch' | 'other',   // required unless noComposition

noComposition:  Boolean,  // brushes/devices etc. — no salts, no dosage form
compositionKey: String,   // DERIVED — buildCompositionKey(salts, form), indexed; absent when noComposition
manufacturer:   String,   // indexed
packSize:       Number,   // 15 (tablets), 100 (ml)
packUnit:       String,   // 'tablet' | 'ml' | 'g' | 'unit'
unitPrice:      Number,   // DERIVED — price / packSize, 2dp
expiryDate:     Date,     // optional batch expiry — shown on every product card
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

## Inventory (procurement + stock control)

The admin **Inventory** module. `Product.stock` stays the authoritative *sellable* quantity the
storefront/checkout read; these collections are a batch/expiry ledger layered on top. All stock
changes go through `src/lib/inventory/stock-mutations.ts` — never mutate `Product.stock` directly
from a route. `Product` also gains an optional `rackLocation: String` (shelf location).

**Supplier** — a distributor we buy from (distinct from `manufacturer`, who makes the drug).
`name`, `nameLower` (DERIVED, unique — case-insensitive dedupe, mirrors ManufacturerCatalog),
`gstin?`, `drugLicenseNo?`, `contactPerson?`, `phone?`, `email?`, `address?`, `paymentTerms?`,
`notes?`, `isActive`. Soft-deleted (`isActive: false`) — referenced by historic purchases.

**StockBatch** — a received lot. `productId`, `batchNumber`, `expiryDate?`, `costPrice`, `mrp?`,
`gstRate?`, `quantityReceived`, `quantityRemaining`, `supplierId?`/`supplierName?`,
`purchaseId?`/`purchaseNumber?`, `receivedAt`, `isDepleted`. Cost/MRP live here, not on the
product, because they change purchase to purchase. FEFO index `{ productId, isDepleted,
expiryDate, receivedAt }`. `Product.expiryDate` is kept in sync with the earliest live batch.

**Purchase** — goods-receipt + supplier invoice. `purchaseNumber` (unique, `PUR-YYYYMM-####`),
`supplierId`/`supplierName`, `invoiceNumber?`, `invoiceDate?`, `status` (draft|ordered|received|
cancelled), `items[]` (`productId`, `productName`, `batchNumber`, `expiryDate?`, `quantity`,
`freeQuantity`, `costPrice`, `mrp?`, `gstRate?`, `lineTotal`), `subtotal`/`taxAmount`/`total`
(recomputed server-side), `paymentStatus` (unpaid|partial|paid) + `amountPaid` (minimal supplier
money — no AP ledger), `attachments[]` (invoice scans), `receivedAt?`. Receiving is guarded by
`receivedAt` so it never applies twice.

**PurchaseReturn** — stock back to a supplier. `returnNumber` (unique, `PRET-YYYYMM-####`),
`supplierId`/`supplierName`, `purchaseId?`/`purchaseNumber?`, `items[]` (`productId`, `batchId?`,
`batchNumber?`, `quantity`, `costPrice`, `reason`, `lineTotal`), totals, `status: 'completed'`.
Applying it lowers stock (named batch or FEFO). Customer returns are NOT here — they go through a
stock-in adjustment (matches the CLAUDE.md v1 scope guard).

**InventoryAdjustment** — manual correction. `productId`/`productName`, `direction` (in|out),
`quantity`, `reason` (opening|recount|counter_sale|damage|wastage|expiry_writeoff|customer_return|
found|other), plus `batchNumber?`/`expiryDate?`/`costPrice?` for an `in` that seeds a batch.
Offline/counter sales are an `out` adjustment (no separate POS). Opening stock is an `in`.

**InventoryHistory** — append-only ledger, one row per stock movement, never updated/deleted.
`productId`/`productName?`, `batchId?`/`batchNumber?`, `type` (opening|purchase|sale|adjustment|
purchase_return), `quantityDelta` (signed), `balanceAfter?`, `reason?`, `refType?`/`refId?`/
`refLabel?`, `createdBy?`. Online sales write a `sale` row via `recordSaleMovement()` from the
payment paths (after the existing `Product.stock` decrement; best-effort, never blocks a sale).

**Counter** — `{ _id: String, seq: Number }`, atomic sequence source for the reference numbers
above (`nextRef()` in `src/lib/inventory/numbering.ts`). `_id` is the counter name, not an ObjectId.

**Product inventory fields:** `rackLocation` (shelf) and `reorderLevel` (stock at/below this is
"low"; defaults to 10) — both editable inline from the stock view.

**Seeding opening stock:** `npx tsx scripts/import-opening-stock.ts data/opening-stock.csv`
(template `templates/opening-stock-template.csv`, columns `sku,batchNumber,expiryDate,quantity,
costPrice,mrp`). Each row is applied as an `opening` stock-in adjustment; idempotent per
`(sku, batchNumber)`.

---

## Conventions

- Money is a `Number` in rupees, rounded to 2 decimals at write time. Never format inside a model.
- All timestamps are UTC. Format to IST in the UI, never in the database.
- Soft delete with `isActive: false`. Never hard-delete a product that appears in an order.
- Reads that feed React use `.lean()`. Serialize `_id` to string at the API boundary.
- Never store a Cloudinary URL without its `publicId` — you can't delete the asset later.
