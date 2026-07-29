# PMStore — end-to-end setup guide

Everything needed to run **the website** and **the Android app** from a clean machine: tools,
environment variables, the external services (APIs) you must sign up for, catalogue import, and
deployment. For deeper reference see `docs/` (architecture, data model, API contract, launch
checklist); this file is the single "get it running" guide.

> **What you're setting up**
> - **Website** — a Next.js 16 (App Router) monolith on MongoDB. This is the whole product.
> - **App** — an Android **Capacitor** shell in `mobile/` that loads the *live website* in a
>   native WebView. There is no separate app codebase; the app IS the site. You only rebuild the
>   app when native config/plugins/icons change, not when the website changes.

---

## 1. Prerequisites

| For | Install |
|---|---|
| Website | **Node.js 20 LTS or newer**, **Git**, a **MongoDB Atlas** account (free M0 tier) |
| App (optional) | **JDK 21**, **Android Studio** (or the Android SDK + platform-tools), a device/emulator |

Check: `node -v` (≥ 20), `git --version`, and for the app `java -version` (21).

---

## 2. Website — local setup

```bash
git clone https://github.com/ashwinhingve/pmstore.git
cd pmstore
npm install
cp .env.example .env.local        # then fill it in — see §3 and §4
npm run dev                       # http://localhost:3000
```

The app boots even with blank keys (integrations degrade gracefully), but you need at least
`MONGODB_URI` and `NEXTAUTH_SECRET` for anything useful. Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` / `npm run start` | Production build (standalone) / run it |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest suite |
| `npm run check:tokens` | Fail on any hardcoded palette color (design-token guard) |
| `npm run check:integrations` | Report which external services are configured vs missing |
| `npx tsx scripts/import-products.ts <file.csv>` | Import the catalogue |
| `npx tsx scripts/backfill-composition.ts` | Recompute `compositionKey` + `unitPrice` |
| `npx tsx scripts/bootstrap-admin.ts` | Grant admin to `ADMIN_BOOTSTRAP_EMAIL` |

---

## 3. Environment variables

Set these in `.env.local` (local) and in your host's env (production). Grouped by service; the
"Required" column is what's needed for the core store to function. Everything else degrades
gracefully (a warning is logged and that feature no-ops) — see §4 for where to get each key.

### Core (required)

| Variable | What it is |
|---|---|
| `MONGODB_URI` | Atlas connection string (`mongodb+srv://…`) |
| `ATLAS_SEARCH_INDEX` | Search index name — keep `products_search` |
| `NEXTAUTH_SECRET` | Random 32-byte secret (command above) |
| `NEXTAUTH_URL` | Site URL — `http://localhost:3000` locally, prod domain live |
| `NEXT_PUBLIC_SITE_URL` | Public URL for metadata/emails/canonical |

### Auth — Google (required for Google sign-in)

| Variable | What it is |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth **Web** client credentials |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same value as `GOOGLE_CLIENT_ID`, exposed to the browser so the **app's** native Google sign-in can request an idToken (the client ID is not a secret) |
| `GOOGLE_ANDROID_CLIENT_ID` | *(optional)* extra allowed idToken audience for the Android client |

### Payments — Cashfree (required to take payments)

| Variable | What it is |
|---|---|
| `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` | Cashfree API credentials |
| `CASHFREE_ENV` | `sandbox` while testing, `production` for live |
| `CASHFREE_RETURN_URL` | `https://<domain>/api/payment/callback` |

### Email — Brevo SMTP (required for OTP/order emails)

`SMTP_HOST` (`smtp-relay.brevo.com`), `SMTP_PORT` (`587`), `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.

### Images — Cloudinary (required for product/prescription image upload)

`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### Optional integrations (degrade gracefully if unset)

| Service | Variables | If missing |
|---|---|---|
| **SMS/OTP** (Fast2SMS) | `FAST2SMS_API_KEY`, `ADMIN_PHONE` | Mobile-OTP login and order SMS no-op |
| **Shipping** (Delhivery) | `DELHIVERY_API_KEY`, `DELHIVERY_*` return address, pincode `462041` hand-delivered | Courier labels/tracking disabled |
| **Push** (FCM) | `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` | Push notifications skipped |
| **WhatsApp/Telegram alerts** | `WHATSAPP_*` / `TELEGRAM_*` | Admin alerts skipped |
| **Monitoring** (Sentry) | `SENTRY_DSN` | No error reporting |
| **Security/bootstrap** | `ALLOWED_ORIGINS`, `ADMIN_BOOTSTRAP_EMAIL` | — |

---

## 4. External services (APIs) — where to get the keys

All free-tier friendly (the project runs on free tiers plus a small VPS).

1. **MongoDB Atlas** — https://cloud.mongodb.com → create a free **M0** cluster → *Database Access*
   (user) + *Network Access* (allow your IP / `0.0.0.0/0` for a VPS) → *Connect → Drivers* copies
   the `mongodb+srv://` string into `MONGODB_URI`. **Then create the Atlas Search index** (§5).
2. **Google OAuth** — https://console.cloud.google.com → *APIs & Services → Credentials* →
   *Create OAuth client ID → Web application*. Authorized redirect URI:
   `https://<domain>/api/auth/callback/google` (and the localhost equivalent). Copy ID/secret.
   For the app you also create an **Android** client (§7).
3. **Cashfree** — https://merchant.cashfree.com → *Developers → API Keys* (use Sandbox first).
4. **Brevo** — https://app.brevo.com → *SMTP & API → SMTP*. `SMTP_USER` is your login,
   `SMTP_PASS` is the SMTP key (300 emails/day free).
5. **Cloudinary** — https://cloudinary.com/console → dashboard shows cloud name / API key / secret.
6. **Fast2SMS** *(optional)* — https://www.fast2sms.com → *Dev API* for `FAST2SMS_API_KEY`
   (Indian mobile OTP; note DLT rules).
7. **Delhivery** *(optional)* — client's Delhivery One account → API token.
8. **Firebase / FCM** *(optional)* — Firebase console → *Project settings → Service accounts →
   Generate private key*; map the JSON to `FCM_*`.
9. **WhatsApp** *(optional)* — Meta developers dashboard (`WHATSAPP_*`); the bot only replies to
   inbound messages (free window).
10. **Sentry** *(optional)* — https://sentry.io project DSN.

Run `npm run check:integrations` any time to see what's wired up.

---

## 5. Database: Atlas Search index

Search (brand + salt, typo-tolerant) needs an Atlas Search index named `products_search` on the
`products` collection:

1. Atlas → your cluster → **Search → Create Search Index → JSON editor**.
2. Database `pmstore`, collection `products`, index name **`products_search`**.
3. Paste the definition from **`scripts/atlas-search-index.json`** and create it.

Without it, search falls back to a basic `$text` query (works, but no fuzzy/salt ranking).

### Seed the catalogue

```bash
npx tsx scripts/import-products.ts <catalogue.csv>   # template: templates/product-import-template.csv
npx tsx scripts/backfill-composition.ts              # recompute derived fields
npx tsx scripts/bootstrap-admin.ts                   # after setting ADMIN_BOOTSTRAP_EMAIL
```

> Never `insertMany`/`updateMany` on products — it skips the pre-save hook that derives
> `compositionKey`/`unitPrice`. The import scripts already use safe writes.

---

## 6. Deployment (website)

**Vercel (preview/CI):** import the repo, add every env var from §3, set `NEXTAUTH_URL` /
`NEXT_PUBLIC_SITE_URL` to the deploy URL. Vercel sets `VERCEL=1`, which switches off `standalone`
output automatically.

**VPS (production, `pratigyamedicalstore.com`):**

```bash
npm ci && npm run build          # produces .next/standalone
node .next/standalone/server.js  # or run under PM2 / systemd behind Nginx (TLS)
```

Point DNS at the VPS, terminate TLS at Nginx, and schedule the cron jobs
(`.github/workflows/cron.yml` — refill reminders, payment reconciliation) or the equivalent
system cron. See `docs/08-LAUNCH-CHECKLIST.md` before go-live.

---

## 7. Mobile app (Capacitor Android)

The app in `mobile/` wraps the live site. All commands run **inside `mobile/`**.

### Build the debug APK

```bash
cd mobile
npm install
# Point Gradle at your SDK (gitignored):
echo "sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk" > android/local.properties
npx cap sync android              # copies capacitor.config.js + plugins into android/
npm run build:apk                 # cd android && ./gradlew assembleDebug  (needs JDK 21 + SDK)
# → mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Install with `adb install app-debug.apk` or open in Android Studio (`npx cap open android`).

### Google sign-in in the app (one-time)

Google blocks OAuth inside WebViews, so the app uses a native plugin → the NextAuth
`google-native` provider. To enable it:

1. Set **`NEXT_PUBLIC_GOOGLE_CLIENT_ID`** on the server = your web `GOOGLE_CLIENT_ID`.
2. Google Cloud Console → *Credentials → Create OAuth client ID → **Android***:
   - Package name: **`com.pratigyamedicalstore.app`**
   - SHA-1: run `cd mobile/android && ./gradlew signingReport` and register the **debug** SHA-1
     for testing and the **release** keystore SHA-1 for production.

Until that's registered, **phone-OTP login still works** in the app (if Fast2SMS is live); Google
just falls through.

### Native behaviour already wired

- **Payments / UPI:** `MainActivity` parses Android `intent:` deep links (GPay/PhonePe, Razorpay/
  Cashfree redirects) and launches the target app; `tel:`/`mailto:`/`upi:` and off-site links are
  handled by Capacitor. Re-run `npx cap sync android` after any `capacitor.config.js` edit.
- **Offline:** `server.errorPath` loads the bundled `www/index.html` on a network error.

### Release build (Play Store)

Generate a release keystore, add a `signingConfig` in `android/app/build.gradle`, then
`./gradlew bundleRelease` for an `.aab`. Register the release SHA-1 (above). The Play listing lives
under the **client's** developer account; declare prescription images as collected health data in
the Data Safety form.

### Verify on a real device

Payments end-to-end (UPI app opens and returns), hardware back navigates WebView history, offline
fallback shows, prescription camera/file picker works.

---

## 8. Pre-launch checklist (condensed)

- [ ] Atlas Search index `products_search` created; catalogue imported; `backfill-composition` run.
- [ ] Core env set in production (`MONGODB_URI`, `NEXTAUTH_SECRET`, Google, Cashfree, Brevo, Cloudinary).
- [ ] Cashfree switched to `production`; `CASHFREE_RETURN_URL` points at the live domain.
- [ ] First admin bootstrapped, then `ADMIN_BOOTSTRAP_EMAIL` removed.
- [ ] `npm run lint && npm run test && npm run build` all green.
- [ ] App: Android OAuth client + SHA-1 registered; on-device payment/back/offline/camera verified.

Full launch/security/SEO checklist: `docs/08-LAUNCH-CHECKLIST.md`.
