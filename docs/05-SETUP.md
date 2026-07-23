# Setup

## Prerequisites

Node 20+, npm 10+, git. A MongoDB Atlas account, Cloudinary account, Brevo account, and a
payment gateway account (Razorpay or Cashfree — confirm with the client which they already have).

## Local

```bash
git clone <repo> pmstore && cd pmstore
npm install
cp .env.example .env.local     # fill in
npm run dev                    # http://localhost:3000
```

Generate secrets:
```bash
openssl rand -base64 32        # NEXTAUTH_SECRET, MOBILE_JWT_SECRET, MOBILE_JWT_REFRESH_SECRET
```

Seed the first admin, then delete `ADMIN_BOOTSTRAP_EMAIL` from the environment:
```bash
npx tsx scripts/bootstrap-admin.ts
```

## MongoDB Atlas (free M0)

1. Create a free M0 cluster. Pick the region closest to your users — `ap-south-1` (Mumbai).
2. Database user with `readWrite` on the `pmstore` database only, not `atlasAdmin`.
3. Network access: your dev IP, plus the VPS IP. Never `0.0.0.0/0`.
4. Copy the connection string into `MONGODB_URI`.

M0 gives 512 MB, which comfortably holds ~5,000 products plus early orders. Move to Flex when
the database passes ~350 MB.

### Atlas Search

Atlas Search is included on M0, limited to 3 indexes. We use one.

1. Atlas UI → your cluster → Search → Create Search Index → JSON Editor.
2. Database `pmstore`, collection `products`, index name `products_search`.
3. Paste `scripts/atlas-search-index.json`.
4. Build the synonym source collection first — the index references it:
   ```bash
   npx tsx scripts/build-search-synonyms.ts
   ```
5. Wait for status `Active` (a few minutes on M0).

Verify:
```bash
npx tsx scripts/test-search.ts "paracetmol"    # should return paracetamol products
```

## Cloudinary (free tier)

Unsigned upload preset for prescription images, restricted to `image/*`, max 5 MB, with an
incoming transformation that caps width at 1600px. Compress client-side before upload as well —
the free tier's credits go fast on full-resolution phone photos.

Folder structure: `pmstore/products/`, `pmstore/prescriptions/`, `pmstore/categories/`.
Prescription images must be **private delivery type with signed URLs**. They're health data;
they must not be publicly addressable.

## Brevo (email, 300/day free)

SMTP relay credentials → `SMTP_*`. Verify the sending domain and add SPF, DKIM and DMARC records
in Cloudflare, or order confirmations will land in spam.

## Payment gateway

Test mode first. Register the webhook/callback URL, store the webhook secret, and verify the
signature on every callback. Never mark an order paid on a client-side success redirect alone.

## Catalogue import

```bash
npx tsx scripts/import-products.ts data/catalogue.csv
```

`templates/product-import-template.csv` is the contract. If the client's export doesn't match,
write a mapping layer in `scripts/mappers/` — do not change the template.

Rejected rows land in `data/rejects-<timestamp>.csv` with a reason column. The import is
idempotent on `sku`, so it is safe to re-run after fixing rejects.

**If the client cannot supply salt composition**, import what they have with
`salts: []` and `isActive: false`, then work through the catalogue in batches of the
top-selling SKUs. Products without a `compositionKey` cannot appear in the Strip and must not
go live — a comparison feature that silently omits brands is worse than no comparison feature.

## Deployment (Hetzner + Dokploy)

Hetzner CX22 (2 vCPU, 4 GB, ~€4/mo), Ubuntu 24.04, Frankfurt or Singapore.

```bash
# on the VPS
curl -sSL https://dokploy.com/install.sh | sh
```

Then in Dokploy: new application → the Git repo → Dockerfile build → set environment variables →
deploy. The repo already builds with `output: 'standalone'`.

Two applications on the same box:
- `pratigyamedicalstore.com` — production
- `staging.pratigyamedicalstore.com` — staging, behind HTTP basic auth, separate database

**Do not use Vercel's free Hobby plan.** Its terms prohibit commercial use and a pharmacy taking
payments is commercial.

## Cloudflare

DNS, proxy on, SSL Full (strict), Auto Minify off (Next.js handles it), Brotli on. Cache rule:
cache `/_next/static/*` for a year. Do not cache `/api/*`.

## Cron

GitHub Actions, so the app process stays stateless. `.github/workflows/cron.yml` hits an
authenticated endpoint with a shared secret:

```yaml
on:
  schedule:
    - cron: '30 3 * * *'   # 09:00 IST
```

Jobs: refill reminders (daily), payment reconciliation (hourly), database backup (daily), expire
stale prescriptions (weekly).

## Backups

```bash
mongodump --uri="$MONGODB_URI" --archive=/backups/pmstore-$(date +%F).gz --gzip
```
Daily cron on the VPS, 7-day retention. **Restore to a scratch database and verify at least once
before launch.** An untested backup is not a backup.

## Monthly cost

| | |
|---|---|
| Hetzner CX22 | ~₹400 |
| Atlas M0, Atlas Search, Cloudinary, Brevo, FCM, Sentry, Cloudflare | ₹0 |
| Payment gateway | per transaction only |
| **Total** | **~₹400–600** |

Plus a one-time Play Store developer fee (~₹2,100) and the domain.
