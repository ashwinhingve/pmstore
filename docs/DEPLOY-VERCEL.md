# Deploy the web app to Vercel (preview / staging)

This hosts the storefront + all API routes at a live `*.vercel.app` URL for testing. It runs on
Vercel's **free Hobby** tier.

> **Important — this is a PREVIEW, not production.** Vercel's Hobby tier prohibits commercial
> (paid-transaction) use, and scheduled jobs need Vercel Pro. The real store stays on the ₹400/mo
> VPS (which uses `output: standalone`). `next.config.js` already switches output automatically:
> `standalone` for the VPS, Vercel default when `VERCEL=1`.

## 1. Import the repo
1. Push `master` to GitHub.
2. On vercel.com → **Add New → Project** → import the repo. Framework auto-detects as **Next.js**.
   Leave build/output settings at their defaults (do **not** override the build command).

## 2. Environment variables (Project → Settings → Environment Variables)
Set these for the **Production** and **Preview** environments. `.env.example` is the full list.

**Required to boot + core features**
| Var | Value |
|---|---|
| `MONGODB_URI` | your Atlas M0 connection string |
| `ATLAS_SEARCH_INDEX` | `products_search` |
| `NEXTAUTH_SECRET` | a long random string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | the Vercel URL (set after first deploy — step 4) |
| `NEXT_PUBLIC_SITE_URL` | the Vercel URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud OAuth |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary |
| `MOBILE_JWT_SECRET` / `MOBILE_JWT_REFRESH_SECRET` | random strings (mobile app auth) |
| `ALLOWED_ORIGINS` | include the Vercel URL (mobile `/api/v1` CORS) |

**Payments — Cashfree (sandbox for preview)**
`CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV=sandbox`,
`CASHFREE_RETURN_URL=<vercel-url>/api/payment/callback`

**Shipping / SMS** — `DELHIVERY_API_KEY` (+ `DELHIVERY_RETURN_*`), `FAST2SMS_API_KEY`, `ADMIN_PHONE`

**Email (Brevo)** — `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`

**Optional** — `FCM_*` (push), `WHATSAPP_*` (bot), `SENTRY_DSN`

## 3. First deploy
Click **Deploy**. You'll get `https://<project>.vercel.app`.

## 4. Point URLs at the deploy, then redeploy once
Update these env vars to the real Vercel URL, then **Redeploy**:
`NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `CASHFREE_RETURN_URL`, and add the URL to `ALLOWED_ORIGINS`.

## 5. Google OAuth
In Google Cloud Console → Credentials → your OAuth client → **Authorized redirect URIs**, add:
`https://<project>.vercel.app/api/auth/callback/google`

## 6. Verify
- Load the site; sign in with Google and with mobile OTP (needs `FAST2SMS_API_KEY`).
- Place a **Cashfree sandbox** order end-to-end.
- Optional: `npx tsx scripts/check-integrations.ts --ping` locally with the same env.

## Known preview limitations
- **No scheduled jobs.** `api/shipping/poll-tracking` and refill reminders need an external
  trigger — point cron-job.org (or the VPS crontab) at those routes with their secret.
- **4.5 MB function body limit.** Prescription images upload **directly to Cloudinary** (unsigned
  preset) from the browser/app, not through an API route — so they're unaffected.
- Cold starts on the free tier add ~1s to the first request after idle.
