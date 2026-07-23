# Prompt library for Claude Code

Paste-ready prompts, one per major task. Each assumes `CLAUDE.md` and the relevant doc are in
context. Adjust as the build diverges from plan.

## How to work a week

```
Read docs/04-ROADMAP.md week N and CLAUDE.md.
Give me a task-by-task plan for this week before writing any code.
Flag anything that conflicts with the docs or that you think is a bad idea.
```

Then work task by task. At the end of each:

```
Run npm run lint && npm run test && npm run build.
Show me what changed and which acceptance criteria from week N this satisfies.
```

---

## Week 1

**Strip and rebrand**
```
Run scripts/phase0-strip.sh, then review the diff. Report anything the script removed
that looks load-bearing, and anything Tapti-related it missed. Don't fix it yet.
```

**Security patches**
```
Apply docs/PHASE-0-PATCHES.md sections 1 and 2 — CORS scoping and DB-driven RBAC.
Write a failing test first for each: a client role hitting an admin route, and a
forged JWT with role: admin. Then make them pass.
```

**Product schema**
```
Extend src/models/Product.ts with the pharma fields in docs/01-DATA-MODEL.md.
Add the pre-save hook deriving compositionKey and unitPrice, and both compound indexes.
Change category from String to ObjectId ref Category.
Write tests proving the hook fires on save and that unitPrice is correct to 2dp.
```

---

## Week 2

**CSV importer**
```
Write scripts/import-products.ts per docs/05-SETUP.md § catalogue import.
Streams the CSV, validates each row with Zod, calls .save() per document so the derive
hook runs, idempotent on sku, writes rejects with reasons to a separate file.
templates/product-import-template.csv is the contract — don't change it.
Test with a 10-row fixture including 2 deliberately bad rows.
```

**Search**
```
Build src/lib/search/query.ts per docs/00-ARCHITECTURE.md § search flow.
Atlas Search compound query: fuzzy on name (boost 3), fuzzy on salts.name (boost 2),
text on manufacturer, filtered to active and not discontinued.
Then GET /api/search and GET /api/search/suggest.
Suggest must return at most 8 results. Include a regex fallback for when Atlas Search
is unavailable — degraded, not down.
```

---

## Week 3

**The Strip**
```
Build src/components/strip/Strip.tsx per docs/03-DESIGN-SYSTEM.md.
Server component. Fetches same-compositionKey products, ranks with rankAlternatives
from src/lib/pharma/composition.ts, renders as a blister pack.

Critical: unitPrice is the headline number, pack size below it, smaller. Never lead with
pack price. Out-of-stock shown dimmed and sorted last. Top-rated badge only at 5+ reviews.

Horizontal snap-scroll on mobile with the current product scrolled into view.
Keyboard navigable with arrow keys.
```

**Product page**
```
Build the product detail page using the tokens and components in docs/03-DESIGN-SYSTEM.md.
Composition, strength, pack size and all prices render in Martian Mono — the mono rule.
RxBadge above the fold for Schedule H/H1/X.
Server-rendered. Target LCP under 2s on Fast 3G.
```

---

## Week 4

**Checkout security**
```
Implement POST /api/checkout/create-order per docs/02-API-CONTRACT.md.

Non-negotiable: reload every product from the DB and ignore all client-supplied prices.
If any line is prescriptionRequired, require a Prescription owned by this user in
pending or verified status, else 422 PRESCRIPTION_REQUIRED.

Write the curl-level test first — call the endpoint directly with an Rx item and no
prescription and assert 422. UI-level blocking is not access control.
```

**Payment**
```
Wire the payment flow per docs/00-ARCHITECTURE.md, preserving the existing
IdempotencyKey pattern from the Taptifs code.
Verify the webhook signature. Decrement stock only inside the verified callback.
Test: invalid signature rejected; same callback replayed twice creates one paid order;
stock decrements exactly once.
```

---

## Week 5

**Reorder**
```
Build POST /api/orders/[id]/reorder per docs/02-API-CONTRACT.md.
Returns added and skipped arrays with reasons. Must feel instant.
Never silently drop an item — a customer refilling a chronic medication has to be told
what didn't make it into the cart.
```

**Refill reminders**
```
Build the RefillReminder model, scripts/send-refill-reminders.ts, and the GitHub Actions
cron per docs/01-DATA-MODEL.md and docs/05-SETUP.md.
One reminder per order line ever — enforce with a unique index, not application logic.
Respect User.refillOptOut. Unsubscribe link in every mail.
Keep the depletion estimate naive: one unit per day. Don't build a dosage engine.
```

---

## Week 6

**SEO**
```
Work the SEO section of docs/08-LAUNCH-CHECKLIST.md end to end.
generateMetadata per route, canonicals, OG, Product/BreadcrumbList/Organization/FAQPage
schema, sitemap.ts, robots.ts, 301s from the legacy .in URLs.
Validate with the Rich Results Test and show me the output.
```

**Launch readiness**
```
Work docs/08-LAUNCH-CHECKLIST.md top to bottom. For every unchecked item, either fix it
or tell me why it can't be fixed this week. Do not mark anything checked you haven't
actually verified.
```

---

## Weeks 7–10

**Bootstrap**
```
Set up mobile/ per docs/06-MOBILE-APP.md. Expo, expo-router, TypeScript strict,
TanStack Query, Zustand.
Port tokens.css to mobile/lib/theme.ts. Load the three fonts via expo-font.
Then build /api/v1/auth/* with bearer tokens — access 15m, refresh 30d, rotated on use,
stored in expo-secure-store. Queue concurrent 401s behind a single refresh.
```

**Strip on mobile**
```
Port the Strip to React Native as a horizontal FlatList with snap points.
Current product scrolled into view on mount. unitPrice stays the headline number.
Same ranking logic — import rankAlternatives, don't reimplement it.
```

---

## Prompts that keep quality up

**Before merging anything**
```
Review this against CLAUDE.md's non-negotiable rules. Specifically check: are we comparing
unitPrice anywhere we should be, does any write path bypass the derive hook, and is any
authorization decision made only in the UI?
```

**When Claude wants to build something not in scope**
```
Check the scope guard in CLAUDE.md. If this is on the do-not-build list, stop and tell me
why you think it's needed rather than building it.
```

**Weekly**
```
Against docs/04-ROADMAP.md week N, which acceptance criteria are actually met and which
are we claiming but haven't verified? Be blunt — I'd rather know now than at launch.
```
