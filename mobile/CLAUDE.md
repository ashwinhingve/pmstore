# Mobile app

Applies in addition to the root `CLAUDE.md`. Full plan in `docs/06-MOBILE-APP.md`.

Expo + expo-router, TypeScript strict, TanStack Query for server state, Zustand for client state.
Android first, structured so iOS is a build target rather than a rewrite.

## Rules

- **Tokens in `expo-secure-store`, never `AsyncStorage`.** AsyncStorage is unencrypted plain text
  on the device. `AsyncStorage` is for the cart only.
- Refresh on 401, retry once, then sign out. **Queue concurrent 401s behind a single refresh** or
  parallel requests will fire competing refreshes and invalidate each other.
- Import shared logic from the web codebase — `rankAlternatives`, Zod schemas, formatters. Do not
  reimplement `unitPrice` or ranking. Divergence between platforms on price comparison is a
  correctness bug, not a cosmetic one.
- Same design tokens, ported in `mobile/lib/theme.ts`. The mono rule applies here too.
- Touch targets 44pt. Type never below 14pt.
- Ask for push permission **after** the first successful order, never on first launch. Denied is
  permanent.
- Checkout requires connectivity — say so plainly up front rather than failing at payment.
- Every push notification deep-links to the relevant screen.

## The Strip

Horizontal `FlatList` with snap points. Current product scrolled into view on mount.
`unitPrice` stays the headline number with pack size below it — same rule as web.

## Play Store

The listing belongs to the **client's** developer account, not the developer's. This is exactly
what went wrong with the previous developer and it is not repeated.

Declare prescription images as collected health data in the Data Safety form. Expect at least one
rejection round in the health category; budget 3–7 days.
