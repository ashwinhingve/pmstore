# 10 — Android app: build & Play Store release

How to build the PM Store Android app for **preview (testing)** and for **production (Play Store)**,
and every account, environment value, and setup step it needs. This is the deep version of
`SETUP.md` §7 — read that first for the short debug loop; come here for signing and publishing.

## What you're shipping (read this once)

The app in `mobile/` is a **thin Capacitor 8 wrapper**: `capacitor.config.js` sets
`server.url = https://pratigyamedicalstore.com`, so the app **is** the live website inside a native
WebView. There is no bundled JavaScript.

The practical consequence: **you do NOT rebuild or re-release the app when the website changes.**
You only build a new APK/AAB when something *native* changes — the Capacitor config, a plugin, the
icon/splash, or the app **version**. Day-to-day product work never touches this doc.

| Fact | Value | Source |
|---|---|---|
| Framework | Capacitor 8.4.2 | `mobile/package.json` |
| Application ID | `com.pratigyamedicalstore.app` | `mobile/android/app/build.gradle` |
| App name | PM Store | `mobile/android/app/src/main/res/values/strings.xml` |
| Current version | `versionName "1.0"`, `versionCode 1` | `mobile/android/app/build.gradle` |
| Min / target / compile SDK | 24 / 36 / 36 | `mobile/android/variables.gradle` |
| Java | 21 | `mobile/android/variables.gradle` |
| Loads | `https://pratigyamedicalstore.com` (live) | `mobile/capacitor.config.js` |
| Offline fallback | `www/index.html` | `mobile/capacitor.config.js` (`errorPath`) |

**TL;DR commands** (all inside `mobile/`):

```bash
# Preview / test build → app-debug.apk
npm install && npx cap sync android && npm run build:apk

# Production build for the Play Store → app-release.aab  (after signing is set up, see §5–6)
cd android && ./gradlew bundleRelease
```

---

## 1. Prerequisites & accounts

Everything here is **free except the Play Console fee**. Per the budget rule in the root
`CLAUDE.md`, that one-time $25 is the only paid item — do not add others without flagging.

| You need | Cost | Notes |
|---|---|---|
| **JDK 21** | Free | Temurin/Adoptium or the JDK bundled with Android Studio. `java -version` must show 21. AGP 8.13 + `sourceCompatibility 21` require it. |
| **Android SDK** | Free | Install Android Studio (easiest — bundles SDK + `adb`), or the standalone command-line tools. Needs SDK Platform **36** and build-tools. |
| **`android/local.properties`** | Free | One line pointing Gradle at the SDK. Gitignored. See §3. |
| **Google Play Console developer account** | **$25 one-time (~₹2,100)** | Belongs to the **client's** Google account, not the developer's (`mobile/CLAUDE.md`). Needed only for production/Play Store, not for preview builds. |
| **Google Cloud project + Android OAuth client** | Free | Enables in-app Google sign-in. Needs the package name + a signing SHA-1. See §4 and §7. |
| **Release keystore** | Free | You generate it once (§5). **Back it up** — lose it and you can never update the same app again. |
| **Firebase `google-services.json`** | Free | *Optional, not in v1.* Only if native push is added later. The Gradle build already no-ops gracefully when it's absent. |

You do **not** need: a Mac, an Apple account, Expo/EAS (the old Expo app was removed), or any paid
CI. Builds run locally on Windows with `gradlew.bat`.

---

## 2. Environment values

Because the app just loads the hosted site, **almost nothing is baked into the APK.** There are no
`.env` files in `mobile/`. The values that matter live on the **web server** (your Vercel/VPS
deployment), and they only affect *in-app Google sign-in*:

| Variable | Where it lives | Purpose |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Web server env | Web OAuth client. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Web server env | Same value; the native plugin requests an idToken for this client. |
| `GOOGLE_ANDROID_CLIENT_ID` | Web server env (optional) | Extra allowed idToken audience for the Android OAuth client. |

The **Application ID** (`com.pratigyamedicalstore.app`) and the **signing SHA-1** are the app-side
half of Google sign-in — they're configured in the Google Cloud **Android OAuth client** (§4, §7),
not in the app's code. Phone-OTP login works in the app with none of this.

> Root rule: never put secrets in client code. The app ships no secrets because it holds none —
> keep it that way. The `GOOGLE_*` client IDs are not secrets, but they belong on the server.

---

## 3. Preview / debug APK (for testing)

Use this to put the app on a real device — for your own testing or to share an APK file with the
client. It's signed with the auto-generated **debug** key, so it installs by sideloading but cannot
go to the Play Store.

```bash
cd mobile
npm install

# Point Gradle at your SDK (gitignored). Windows example:
echo "sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk" > android/local.properties

npx cap sync android          # copies capacitor.config.js + plugins into android/
npm run build:apk             # = cd android && ./gradlew assembleDebug   (needs JDK 21 + SDK)
# → mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Install / share:

```bash
adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk
# or just send the .apk file — the client enables "install from unknown sources" once to open it.
```

On Windows use `gradlew.bat` if calling Gradle directly (e.g. `cd android && .\gradlew.bat assembleDebug`).
`npm run build:apk` works from Git Bash / PowerShell as written.

### Make Google sign-in work in the preview build

The **debug** keystore has its own SHA-1. Register it so Google login works while testing:

```bash
cd mobile/android && ./gradlew signingReport      # copy the SHA1 under "Variant: debug"
```

Add that SHA-1 to the Google Cloud **Android OAuth client** (§4). Until then, Google sign-in falls
through but **phone-OTP still works** in the app.

---

## 4. Google Cloud — Android OAuth client (one-time)

Needed for native Google sign-in (`@capgo/capacitor-social-login` → the NextAuth `google-native`
provider in `src/lib/auth.ts`).

1. Google Cloud Console → **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Android**.
3. Package name: **`com.pratigyamedicalstore.app`**.
4. SHA-1 certificate fingerprint: add the **debug** SHA-1 for testing (§3). For production you also
   add the **Play App Signing** SHA-1 — see §7, this is the step people miss.
5. On the server, set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (= `GOOGLE_CLIENT_ID`) and optionally
   `GOOGLE_ANDROID_CLIENT_ID`.

You can add multiple SHA-1s to one Android client — keep both the debug and the Play app-signing
fingerprints registered.

---

## 5. Production signing — generate a keystore & wire it up

A Play Store build must be signed with **your own release (upload) key**, not the debug key. Do this
once.

### 5a. Generate the upload keystore

```bash
keytool -genkeypair -v \
  -keystore pmstore-upload.keystore \
  -alias pmstore \
  -keyalg RSA -keysize 2048 -validity 10000
```

It prompts for a keystore password, a key password, and a name/org. **Store the keystore file and
both passwords somewhere safe and backed up off the build machine** (a password manager + a private
backup). If you lose this file you cannot ship updates to the same app listing — you'd have to
publish a brand-new app.

> Keep the keystore **out of git**. `mobile/android/.gitignore` has the `*.jks` / `*.keystore` lines
> **commented out**, so they are *not* ignored by default. Either keep the keystore outside the repo
> (recommended) or uncomment those two lines first.

### 5b. Reference it without hardcoding passwords

Create `mobile/android/keystore.properties` (do **not** commit it — add it to
`mobile/android/.gitignore`):

```properties
# Recommended: an ABSOLUTE path to a keystore kept OUTSIDE the repo.
storeFile=C:/Users/<you>/keys/pmstore-upload.keystore
storePassword=<keystore password>
keyAlias=pmstore
keyPassword=<key password>
```

> `storeFile` may be absolute (shown) or relative — a relative `storeFile` is resolved from the
> **app module** dir `mobile/android/app/`, which is easy to get wrong, so prefer an absolute path
> to a keystore that lives outside the working tree.

Then add a `signingConfig` to `mobile/android/app/build.gradle`. Load the properties at the top of
the file (before the `android {` block):

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Inside `android { ... }`, add a `signingConfigs` block and point the `release` build type at it:

```gradle
android {
    // ...existing namespace / defaultConfig...

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release   // add this line
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

> Never put the passwords directly in `build.gradle` — it's tracked in git. The
> `keystore.properties` indirection keeps them out of version control.

### 5c. Bump the version for every release

In `mobile/android/app/build.gradle`, before each Play upload:

- Increase **`versionCode`** by 1 (integer). **Every** upload to Play must have a strictly higher
  `versionCode` than the last — Play rejects a duplicate.
- Update **`versionName`** to the human version (e.g. `"1.0"` → `"1.1"`). Shown to users; any string.

The first release keeps `versionCode 1` / `versionName "1.0"` as-is.

---

## 6. Build the release bundle (AAB)

The Play Store wants an **Android App Bundle (`.aab`)**, not an APK.

```bash
cd mobile
npx cap sync android                 # only needed if native config/plugins/icons changed
cd android && ./gradlew bundleRelease
# → mobile/android/app/build/outputs/bundle/release/app-release.aab
```

(Need a signed *APK* instead — e.g. to sideload a production build for testing? Use
`./gradlew assembleRelease` →
`mobile/android/app/build/outputs/apk/release/app-release.apk`.)

Confirm the build is signed with your upload key, not the debug key:

```bash
cd mobile/android && ./gradlew signingReport   # the "release" variant should show your key
```

---

## 7. Play App Signing & the SHA-1 that actually matters

**Read this or in-app Google sign-in will work in your test build and silently break in
production.**

When you upload your first `.aab`, Google Play **App Signing** takes over: Google generates and
holds the real *app signing key*, while your keystore becomes only the *upload key*. That means the
certificate that signs the app users install is **Google's**, not yours — so its SHA-1 is different
from your upload keystore's SHA-1.

For production Google sign-in you must register **Google's app-signing SHA-1**:

1. Play Console → your app → **Test and release → Setup → App integrity** (a.k.a. **App signing**).
2. Copy the **SHA-1** under **App signing key certificate**.
3. Add it to the Google Cloud **Android OAuth client** (§4), alongside the debug and upload SHA-1s.

Register all the fingerprints you use — debug (local testing), upload key, and Play app-signing key.

---

## 8. Play Console — first-time submission

The listing lives under the **client's** Play Console developer account.

### 8a. Create the app
Play Console → **Create app** → app name **PM Store**, default language, type **App**, **Free**, and
accept the developer program declarations.

### 8b. Upload to Internal testing first (do not go straight to production)
**Test and release → Testing → Internal testing → Create new release**:
1. Let Google **enable Play App Signing** (accept the default).
2. Upload `app-release.aab`.
3. Add tester emails, save & roll out, then share the **opt-in link** with the client.
4. Install from that link and **verify on a real device** (see §10) before promoting.

### 8c. Store listing
**Grow → Store presence → Main store listing**:
- App name, **short description** (≤80 chars), **full description**.
- **App icon** 512×512 PNG.
- **Feature graphic** 1024×500.
- **Phone screenshots** — at least 2 (real screens of the running app).
- Icon/splash source art lives in `mobile/assets/`; screenshots you capture from the app.

### 8d. Content rating
**Policy → App content → Content rating** — complete the IARC questionnaire (a pharmacy/health
storefront is generally low-rated, but answer honestly).

### 8e. Data Safety form (mandatory — health app, expect scrutiny)
**Policy → App content → Data safety**. Declare what the app collects and how. At minimum:
- **Prescription images** → *Health and fitness / Health info* — collected, **encrypted in
  transit**, tied to the account, used to fulfil orders.
- **Phone number** and **address** → *Personal info* — collected for orders/delivery.
- State the **data-deletion** path (account deletion / support request).
- Do **not** under-declare. This ties to the root rules: prescription URLs, phone numbers, and
  addresses are health/PII and must never be logged.

### 8f. Privacy policy & other declarations
- Add the **Privacy policy URL** (the site's existing privacy page) under App content.
- Complete Ads, Target audience, Government-apps, and any other required declarations.

### 8g. Pharmacy / online-pharmacy policy — plan for extra review
Google Play restricts **online pharmacy** apps. Expect to:
- Possibly provide proof of a **valid pharmacy licence** / registration and pharmacy details.
- Face **longer or manual review** than a typical app.

Confirm the client's pharmacy licence and registration details are ready **before** you submit, so a
policy request doesn't stall the launch. Don't promise a go-live date that assumes instant approval.

### 8h. Promote to Production
Once internal testing passes and all "App content" sections are green:
**Test and release → Production → Create new release** → reuse the same `.aab` (or a newer
`versionCode`) → roll out (staged rollout recommended). Then wait for review.

---

## 9. Shipping an update later

Because of the `server.url` wrapper, most work needs **no** app update — website changes are live
instantly in the app.

Rebuild + re-upload **only** when native config, a plugin, the icon/splash, or permissions change:

```bash
# 1. Bump versionCode (and versionName) in mobile/android/app/build.gradle
# 2. Sync native changes if any:
cd mobile && npx cap sync android
# 3. Rebuild the signed bundle:
cd android && ./gradlew bundleRelease
# 4. Upload the new app-release.aab to a testing track → promote to Production
```

---

## 10. Verify on a real device (before every production rollout)

From `mobile/CLAUDE.md` — the WebView wrapper's behaviour can't be trusted until seen on hardware:

- **Payments / UPI:** checkout opens a UPI app (GPay/PhonePe) via the `intent:` handling in
  `MainActivity` and returns to the order. The `intent:` path is untested on-device — check it.
- **Hardware back button:** navigates WebView history and only exits at the root, not mid-flow.
- **Offline:** kill the network → `www/index.html` shows (not a blank screen).
- **Prescription upload:** the WebView camera/file picker works (CAMERA + READ_MEDIA_IMAGES are
  declared).
- **Google sign-in:** works with the correct SHA-1 registered (§7).

---

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| `SDK location not found` | Create `mobile/android/local.properties` with `sdk.dir=<path>` (§3). |
| `invalid source release: 21` / Gradle JDK errors | You're not on **JDK 21**. Check `java -version`; set the Gradle JDK to 21 in Android Studio (Settings → Build Tools → Gradle). |
| Google sign-in works in debug, fails in production | You registered the debug/upload SHA-1 but not the **Play App Signing** SHA-1 (§7). Add it to the Android OAuth client. |
| `Keystore file not found` / signing fails on `bundleRelease` | Check `keystore.properties` `storeFile` path (relative to `mobile/android/`) and the passwords (§5b). |
| Play rejects the upload: "version code already used" | Bump `versionCode` (§5c). |
| Push notifications not working | Expected — not wired in v1. Native push needs `google-services.json` + a push plugin (future work). |

---

## 12. Pre-submit checklist

- [ ] Upload keystore generated and **backed up off the build machine**; `keystore.properties` gitignored.
- [ ] `signingConfig` wired; `bundleRelease` produces a signed `app-release.aab`.
- [ ] `versionCode` bumped above the last uploaded release.
- [ ] Google Cloud Android OAuth client has **debug + upload + Play App Signing** SHA-1s registered (§7).
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set on the server.
- [ ] On a real device: payments/UPI, hardware back, offline fallback, prescription camera, Google sign-in all verified (§10).
- [ ] Play Console: store listing complete, **content rating** done, **Data Safety** (health data) declared, **privacy policy URL** set.
- [ ] Pharmacy licence / registration details ready for Google's policy review (§8g).
- [ ] Uploaded to **Internal testing**, verified, then promoted to **Production**.

---

**See also:** `SETUP.md` §7 (short mobile build loop) · `mobile/CLAUDE.md` (native rules) ·
`docs/08-LAUNCH-CHECKLIST.md` (full go-live checklist).
