# Play Store listing pack — PM Store

Ready-to-paste copy and answers for the Google Play Console submission. **All public-facing
copy here is a draft — the client (Pratigya Medical Store) must approve it before it goes live,**
and a pharmacist should confirm nothing overclaims. Companion to `docs/10-ANDROID-RELEASE.md`
(the build/signing/submission runbook).

---

## 1. Store listing text

**App name** (max 30 chars) — pick one:
- `PM Store: Pratigya Medical` (26)
- `PM Store` (8)

**Short description** (max 80 chars):
```
Order genuine medicines online from Pratigya Medical Store, with home delivery.
```

**Full description** (max 4000 chars):
```
PM Store is the official app of Pratigya Medical Store, your neighbourhood pharmacy — now
delivering genuine medicines and health products to your door.

WHAT YOU CAN DO
• Search by brand or salt (e.g. "Dolo 650" or "paracetamol") with typo-tolerant results.
• See the price per tablet/ml, not just the pack price, so you can tell which pack is
  actually better value.
• Compare brands that share the same composition, side by side.
• Upload your doctor's prescription for medicines that require one.
• Track your order from confirmation to delivery.
• Reorder your regular medicines in one tap, and set refill reminders so you don't run out.
• Not sure what to order? Send us your prescription and our team will build the cart for you.

GENUINE & TRUSTED
Pratigya Medical Store is a licensed pharmacy. We stock authentic products sourced through
proper channels.

PRESCRIPTION MEDICINES
Some medicines (Schedule H / H1 / X) can only be dispensed against a valid prescription, as
required by Indian law. For these items the app will ask you to sign in and upload a
prescription before checkout. Over-the-counter products need none of this.

DELIVERY
We deliver to serviceable pincodes. Delivery availability and charges are shown at checkout.

NEED HELP?
Reach us any time from the Contact section in the app.

Pratigya Medical Store — genuine medicines, honest prices, delivered.
```

> Do NOT include disease-treatment claims, "cheapest"/"guaranteed" superlatives, or medical
> advice — Google restricts these and rule #1 (honest unit pricing) applies to marketing too.

---

## 2. Graphic assets

| Asset | Spec | Status |
|---|---|---|
| App icon | 512×512 PNG, 32-bit | ✅ `mobile/playstore-icon.png` (generated) |
| Feature graphic | 1024×500 PNG/JPG (no transparency) | ⬜ needs design |
| Phone screenshots | ≥2, 16:9 or 9:16, min 320px | ⬜ capture from the app (home, search, product/Strip, cart, order tracking) |
| (optional) 7"/10" tablet shots | — | ⬜ optional |

Capture screenshots from the running app on a phone (or emulator). Good set: home page, a
search result showing the price-per-tablet comparison, a product page with the Strip, the cart,
and the prescription-upload screen.

---

## 3. Data Safety form (Play Console → App content → Data safety)

Answer honestly — this is legally binding. The app collects real health + personal data.

**Does your app collect or share user data?** → **Yes.**

| Data type | Collected | Shared | Purpose | Notes |
|---|---|---|---|---|
| Name | Yes | No | Account, delivery | |
| Email address | Yes | No | Account, order updates | |
| Phone number | Yes | No | Account, delivery, order updates | |
| Address | Yes | No | Delivery | |
| **Health info (prescription images)** | **Yes** | No | Order fulfilment (dispensing Rx medicines) | **Declare as health data.** Stored on Cloudinary as authenticated/signed assets. |
| Payment info | Not collected by app | Processed by payment provider | Purchases | Razorpay/Cashfree handle card/UPI details; the app does not store them. |
| Purchase history | Yes | No | Order history, reorder | |
| Device IDs / push token (FCM) | Yes | No | Order + refill notifications | |

**Security practices to declare:**
- Data is encrypted in transit (HTTPS): **Yes**.
- Users can request that data be deleted: **Yes** — provide the account-deletion path (see §5).
- Committed to Play Families policy: N/A (not a kids' app).

> Root rule: never log prescription URLs, phone numbers, or full addresses. The Data Safety
> declaration must match what the code actually does.

---

## 4. Content rating (IARC questionnaire)

- Category: **Utility / Shopping** (it's a store, not a game).
- References to pharmaceuticals/medicine: answer **Yes** where asked about drug/medical
  references (medicines are sold), **No** to violence/sexual/gambling content.
- Expected outcome: rated for a general audience, but let the questionnaire decide — answer
  truthfully.

---

## 5. Required policy URLs & declarations

- **Privacy policy URL**: `https://pratigyamedicalstore.com/privacy` (already exists — confirm
  it's reachable and current).
- **Account / data deletion**: Play requires a way for users to request deletion. Confirm the
  app or website offers it (an account-deletion request via Contact is acceptable if there's no
  in-app delete). Provide the URL/path in the Data Safety form.
- **Health/pharmacy declaration**: online-pharmacy apps are a restricted category. Expect Google
  to ask for proof of a **valid pharmacy licence** and possibly a manual review. Have the licence
  document ready before submitting — this is the most likely launch blocker, so line it up early.

---

## 6. Submission order (see docs/10-ANDROID-RELEASE.md for build steps)

1. Fill in `mobile/android/keystore.properties`, then build the signed AAB (`bundleRelease`).
2. Play Console → create app (client's account) → **Internal testing** track → upload the AAB.
3. Complete store listing (§1), graphics (§2), Data Safety (§3), content rating (§4), policy
   URLs (§5).
4. Add internal testers, install from the Play link, verify on a real device.
5. Register the **Play App Signing SHA-1** into the Google Cloud Android OAuth client (§7 of the
   release doc) so Google sign-in works in production.
6. Promote Internal → Production once the pharmacy-licence review clears.
