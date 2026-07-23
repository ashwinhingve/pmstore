# Mobile app — weeks 7 to 10

Expo React Native, Android first, structured so iOS is a build target and not a rewrite. Lives
in `mobile/` in the same repo so types and validation schemas are shared with the web.

## Stack

| | |
|---|---|
| Framework | Expo SDK (latest stable), expo-router (file-based, mirrors Next.js) |
| Language | TypeScript strict |
| State | Zustand — same store patterns as web |
| Data | TanStack Query for server state, caching and offline |
| Storage | `expo-secure-store` for tokens, `AsyncStorage` for the cart only |
| Images | `expo-image` |
| Push | `expo-notifications` + FCM |
| Payments | Gateway's React Native SDK |
| Builds | EAS Build free tier |

## Structure

```
mobile/
  app/
    (tabs)/      index · search · cart · orders · account
    product/[slug].tsx
    checkout/    address · payment · confirm
    prescription/upload.tsx
    auth/        login · verify
  components/    Strip · ProductCard · PriceBlock · RxBadge
  lib/
    api/         typed client, auth interceptor
    theme.ts     tokens ported from tokens.css
  store/
```

## Auth

```
POST /api/v1/auth/otp/request   → OTP by email
POST /api/v1/auth/otp/verify    → { accessToken (15m), refreshToken (30d), user }
POST /api/v1/auth/refresh       → rotates both
```

Both tokens go in `expo-secure-store`. **Never `AsyncStorage` for tokens** — it's unencrypted
plain text on the device.

The API client retries once on 401 after refreshing. If the refresh fails, clear storage and
route to login. Queue concurrent 401s behind a single refresh so five parallel requests don't
fire five refreshes and invalidate each other.

## Design on mobile

The tokens carry over unchanged. Two adaptations:

- **The Strip** becomes a horizontal `FlatList` with snap points. The current product is scrolled
  into view on mount. `unitPrice` stays the headline number.
- Bottom tab bar for the five primary destinations. Search is a tab, not a header icon — it's
  the main way people find things.

Touch targets 44pt minimum. Type no smaller than 14pt anywhere.

## Offline

Cart persists locally and syncs on reconnect. Product detail and order history are cached by
TanStack Query and served stale-while-revalidate. Checkout requires connectivity and says so
plainly rather than failing at payment.

## Push (FCM, free)

Ask permission **after** the first successful order, not on first launch — a permission prompt
before any value is delivered gets denied and cannot be asked again.

Notify on: order confirmed, out for delivery, delivered, prescription verified or rejected,
refill due. Nothing promotional in v1. Every push deep-links to the relevant screen.

## Play Store

New listing under the client's own developer account, not yours — this matters, and it's exactly
what went wrong with the previous developer.

Required: privacy policy URL, Data Safety form (declare prescription images as health data and as
collected), content rating, target API level, and the pharmacy/health declarations. Budget 3–7
days for review and expect at least one rejection round in the health category.

**The old app cannot be transferred.** Existing installs, ratings and reviews do not carry over.
The client needs to have communicated this to customers before launch.

## Testing matrix

Android 9 through 15. One low-end device (2 GB RAM), one flagship, one small screen (5"), one
tablet. Test on a real throttled connection, not just the emulator.
