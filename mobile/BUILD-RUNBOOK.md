# PMStore Mobile — Build & Deployment Runbook

This document covers the steps to build, test, and submit the Expo Android app to the Play Store.

## Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- An Apple ID (for iOS) or Google Play Developer Account (for Android)
- A real Android device or emulator running Android 9+

## Development Setup

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure Environment

Create `.env.local`:

```bash
EXPO_PUBLIC_API_URL=https://api.pratigyamedicalstore.com
```

This must match your backend API endpoint.

### 3. Add Fonts

Download and place font files in `mobile/assets/fonts/`:

- `BricolageGrotesque-800.ttf` — https://fonts.google.com/specimen/Bricolage+Grotesque
- `PublicSans-400.ttf`, `PublicSans-600.ttf` — https://fonts.google.com/specimen/Public+Sans
- `MartianMono-400.ttf` — https://fonts.google.com/specimen/Martian+Mono

### 4. Add Google Services Configuration

For FCM push notifications, add `google-services.json` (provided by Firebase/Google Cloud Console):

```bash
cp /path/to/google-services.json mobile/
```

This file is gitignored for security.

### 5. Create Placeholder Assets

Create simple placeholder icons and splash image in `mobile/assets/`:

- `icon.png` (1024x1024) — app icon
- `splash.png` (1242x2436) — splash screen
- `adaptive-icon.png` (1024x1024) — Android adaptive icon
- `notification-icon.png` (192x192) — FCM notification icon
- `favicon.png` (192x192) — web favicon
- `notification.wav` (optional) — notification sound

These can be simple placeholder PNGs for development. In production, use the client's branding.

## Development Workflow

### Run on Android

```bash
npm run android
```

This launches the Expo dev server and opens the app on your connected Android device or emulator.

### Run on iOS (if building for iOS)

```bash
npm run ios
```

### Local Testing

1. **Auth Flow**: Sign in with OTP
2. **Search**: Search for a medicine
3. **Product Detail**: View product with Strip alternatives
4. **Cart**: Add item to cart, modify quantities
5. **Checkout**: Select address, choose payment method (test COD)
6. **Orders**: View past orders

### Linting & Type Checking

```bash
npm run lint
```

All TypeScript must be strict (no `any`). Fix linting errors before building.

## Building for Production

### 1. Initialize EAS

```bash
eas init
```

This creates an `eas.json` file and associates the project with Expo. Requires an Expo account.

### 2. Configure app.json

Ensure these fields are set:

- `expo.name`: "PMStore"
- `expo.slug`: "pmstore"
- `expo.owner`: your-expo-username
- `expo.extra.eas.projectId`: from `eas init`
- `expo.android.package`: "com.pratigyamedicalstore.app"
- `expo.ios.bundleIdentifier`: "com.pratigyamedicalstore.app"
- `expo.version`: "1.0.0"

### 3. Build for Android

```bash
npm run build
```

This builds the signed APK via EAS. Credentials are managed securely by EAS.

### 4. Build for iOS (if needed)

```bash
eas build --platform ios
```

## Play Store Submission

### 1. Create Google Play Developer Account

Visit https://play.google.com/apps/publish and register. Cost: ₹2,499 (one-time).

### 2. Privacy Policy

The app collects and uploads prescription images. Create a privacy policy that:

- States that prescription images are collected and uploaded for processing
- Explains HIPAA/data protection compliance
- Provides a contact email for data requests

Host this at `https://pratigyamedicalstore.com/privacy`.

### 3. Data Safety Form

In Google Play Console, fill out the Data Safety questionnaire:

- **Prescription Images**: Mark as "Collected" and "Sensitive health information"
- **User Authentication**: Mark as "Collected"
- **No personal data sharing**: Confirm data is not shared with third parties
- **Data retention**: Prescriptions are retained for verification purposes

### 4. Content Rating

Fill the IARC content rating questionnaire:

- App type: "Utilities"
- Medical category: Select "Health: Information/Services"

### 5. Target API Level & Permissions

- Target API Level: 34 (set in `app.json`)
- Requested permissions:
  - `android.permission.CAMERA` (prescription capture)
  - `android.permission.READ_EXTERNAL_STORAGE` (gallery upload)
  - `android.permission.WRITE_EXTERNAL_STORAGE` (image cache)
  - `com.google.android.c2dm.permission.RECEIVE` (FCM)

### 6. Testing Artifact

Download the APK from EAS:

```bash
eas build --platform android --status
```

Test the APK on real devices:

- Android 9 (low-end device if possible)
- Android 12 (mid-range)
- Android 15 (latest)

Test full flow:

1. Install and launch
2. Sign in with OTP
3. Search for medicines
4. Add to cart
5. Proceed to checkout
6. Place COD order
7. Verify order appears in Orders tab

### 7. App Bundle Submission

For Play Store, submit an Android App Bundle (AAB):

1. Build via EAS (already done above)
2. In Google Play Console, go to **Release** → **Production**
3. Upload the AAB
4. Fill in release notes (describe what's new)
5. Set target audience, content rating, privacy policy
6. Submit for review

### 8. Handle Rejections

- **Health app rejection (very likely)**: You may be asked to clarify prescription security, HIPAA compliance, or data handling. Respond promptly.
- **Timeline**: Budget 3–7 days for initial review, likely 2–3 days for rejection response, then 2–3 days re-review.

## Post-Launch Monitoring

### 1. Crash Reporting

TODO: Integrate Sentry or Firebase Crashlytics for remote error tracking.

### 2. Analytics

TODO: Integrate Firebase Analytics to track user flows (sign-ups, searches, orders).

### 3. Push Notifications

Verify FCM tokens are registered via `/api/v1/push/register` after first successful order.

### 4. App Updates

To push a new version:

1. Bump version in `app.json` and `package.json`
2. Rebuild: `npm run build`
3. Upload the new AAB to Google Play Console
4. Users get automatic updates within hours

## Troubleshooting

### "API version mismatch"

The app checks `apiVersion` in every response. If the server changes to `apiVersion: 2`, the app will warn the user to update.

### "401 Unauthorized" loops

The refresh-queue logic should prevent concurrent refreshes from causing token invalidation. If this still happens:

1. Check that `SecureStore` is working on the device
2. Verify refresh token expiry is 30 days
3. Check server-side token version bumping on logout

### "Out of Memory" on image upload

Prescription images are compressed via `expo-image-manipulator` before upload. If still too large:

1. Reduce image width further (currently 1024px)
2. Reduce compression quality (currently 0.7)
3. Limit to 3 images instead of 5

## Handing Over to Client

When the app is live on Play Store:

1. **Update their Play Store listing** with store URL and credentials (keep secure)
2. **Admin credentials**: Make sure they can access the `/admin` panel on the web
3. **Support contact**: Ensure they know who to contact for issues
4. **Monitoring**: Walk them through viewing crash reports in Google Play Console
5. **Update policy**: Explain how to request new app releases

## Glossary

- **EAS**: Expo Application Services — build, submit, and update infrastructure
- **AAB**: Android App Bundle — optimized format for Play Store (smaller than APK)
- **FCM**: Firebase Cloud Messaging — push notification service
- **SecureStore**: Encrypted on-device storage for tokens
- **Refresh Token**: Long-lived (30 days); used to get new access tokens
- **Access Token**: Short-lived (15 min); sent with every API request
