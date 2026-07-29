# Mobile app — Capacitor wrapper

Applies in addition to the root `CLAUDE.md`.

The mobile app is a **thin Capacitor shell that loads the live website**
(`https://pratigyamedicalstore.com`) in a native WebView — one codebase, no separate app to
maintain. It replaced the old Expo React Native app (removed; see git history). Android first;
iOS is a later `npx cap add ios`.

## How it works
- `capacitor.config.js` sets `server.url` to the production site, so the app IS the website.
  It's `.js` (CommonJS) not `.ts` on purpose: the Capacitor 8 CLI fails to parse a `.ts` config
  on Node 22 (`Cannot read properties of undefined (reading 'CommonJS')`).
- `www/index.html` is the offline fallback (brand-styled). `webDir: www`.
- `server.allowNavigation` keeps the store origin + Razorpay/Cashfree inside the WebView; other
  http(s) links open in the system browser.
- App id `com.pratigyamedicalstore.app`, name "PM Store". Icon/splash generated from
  `assets/icon.png` (1024) + `assets/splash.png` (2732), themselves rasterized from
  `public/app-icon.svg`.

## Commands (run inside `mobile/`)
```bash
npm install                       # restore deps from package-lock
npm run assets                    # regenerate Android icons/splash from assets/*.png
npx cap sync android              # copy config + plugins into android/
npm run build:apk                 # cd android && ./gradlew assembleDebug  (needs Android SDK + JDK 21)
npx cap open android              # open in Android Studio to build/run
```
`server.url` means you do NOT rebuild the app when the website changes — only when native config,
plugins, or icons change.

## Must verify on a real device (not done in the setup PR)
- **Payments**: Cashfree/UPI. `upi:`/`intent:` schemes may not open from the WebView by default —
  if a UPI app doesn't launch, add a `WebViewClient.shouldOverrideUrlLoading` override in
  `MainActivity` that `startActivity(Intent.parseUri(url, ...))` for non-http(s) schemes.
- **Hardware back button**: should navigate WebView history and exit at the root (Capacitor
  default) — confirm it doesn't exit the app mid-flow.
- **Offline**: `www/index.html` only shows if a native `onReceivedError` loads it — confirm/add.
- **Prescription upload**: WebView file/camera picker (permissions declared: CAMERA,
  READ_MEDIA_IMAGES).

## Google sign-in (in-app)
Google blocks OAuth in embedded WebViews. In-app Google uses a **native Google plugin** → NextAuth
`google-native` Credentials provider (`src/lib/auth.ts`) that verifies the idToken and sets a
same-origin session in the WebView. Requires a **Google Cloud Android OAuth client** for
`com.pratigyamedicalstore.app` + the signing **SHA-1** (`cd android && ./gradlew signingReport`).
Phone-OTP login works in the WebView without any of this.

## Play Store
The listing belongs to the **client's** developer account, not the developer's. Declare
prescription images as collected health data in the Data Safety form. Do not log prescription
URLs, phone numbers, or addresses (root rule).
