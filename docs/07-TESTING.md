# Testing

The base repo inherited zero tests on code that moves money. That's the single largest risk
carried into this project. The bar below is the minimum, not the goal.

```bash
npm i -D vitest @vitest/coverage-v8 mongodb-memory-server
npm run test
npm run test:watch
```

## Priority order

Write them in this order. Each tier is worth more than everything below it.

### 1. Pure functions — week 1, non-negotiable

`src/lib/pharma/composition.ts` is the foundation of every headline feature and is trivially
testable.

- `buildCompositionKey` — alias resolution (`acetaminophen` → `paracetamol`), salt-form suffix
  stripping (`amlodipine besylate` → `amlodipine`), unit conversion (`500 mcg` === `0.5 mg`),
  multi-salt ordering (`A + B` === `B + A`), form equivalence (capsule groups with tablet)
- `computeUnitPrice` — rounding, `packSize` of 0 or missing
- `rankAlternatives` — badge assignment, the 5-review floor on top-rated, out-of-stock sorting
  last, savings null for the current product and for anything not cheaper
- `src/lib/gst.ts` — every GST slab, inclusive pricing, rounding to paisa

### 2. Security boundaries — week 1 and 4

These are the tests that stop real harm.

- A `client` role gets 403 on every admin route
- A `staff` role gets 403 on settings, users, bulk price and bulk stock
- A tampered JWT with `role: admin` still fails, because the handler re-reads from the database
- `POST /api/checkout/create-order` with an Rx item and no prescription returns 422 — called
  directly, not through the UI
- Prices sent by the client are ignored; the order total comes from the database
- A prescription belonging to another user cannot be attached to your order

### 3. Money paths — week 4

- Payment callback with an invalid signature is rejected
- Replaying the same callback twice creates exactly one paid order
- Stock decrements exactly once, and never on a failed payment
- Order totals match GST calculation to the paisa
- COD confirm cannot be called on an already-paid order

### 4. Data integrity — week 2 and 5

- Import of a valid CSV produces correct `compositionKey` and `unitPrice` on every row
- Import is idempotent — running twice does not duplicate by SKU
- Bad rows are rejected with a reason, not silently dropped
- Bulk price update recomputes `unitPrice` on all affected rows
- Export re-imports cleanly with no loss

### 5. Retention features — week 5

- Reorder skips out-of-stock and discontinued items and reports what it skipped
- Refill reminder fires once per order line, ever
- `refillOptOut` suppresses all reminder mail

## Integration tests

`mongodb-memory-server` for a real database per test file. Do not mock Mongoose — the bugs live
in the query and hook behaviour, which mocks hide by construction.

```ts
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });
afterEach(async () => { await mongoose.connection.dropDatabase(); });
```

## Manual QA before each launch

- Full purchase on a real Android phone, real payment, then refund it
- Same on iOS Safari — different enough to break things
- Keyboard-only navigation through search → product → cart → checkout
- Screen reader on the product page and checkout
- 200% browser zoom
- Throttled Fast 3G
- 320px viewport

## CI

`.github/workflows/ci.yml` runs lint, test and build on every push. A red build does not merge.
Free on public and private repos at this scale.

## Coverage

Not a target to game. But `src/lib/pharma/` and `src/lib/gst.ts` should be at 100%, and anything
touching payments or roles should have a test naming the specific failure it prevents.
