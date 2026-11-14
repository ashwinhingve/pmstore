# Remove unused native Facebook SDK and Advertising ID

## Findings

PM Store calls only `SocialLogin.initialize({ google: { webClientId } })` and `SocialLogin.login({ provider: 'google' })`. NextAuth provides web Google and `google-native` authentication, not Facebook Login. No Facebook App ID, client token, login call or button was found. The separately configurable website Meta Pixel and server-side WhatsApp Cloud API use Facebook endpoints, but do not require the Android Facebook Login SDK; neither was changed.

Capgo Social Login 8.3.39 enabled Facebook by default. Its resolved release chain was `facebook-login:18.1.3 → facebook-core:18.1.3 → installreferrer:1.0`. Facebook Core supplied `AD_ID` and the Android ad-services permissions. That SDK contained Advertising ID retrieval code even though PM Store did not initialize Facebook Login.

## Implementation and changed files

- `mobile/capacitor.config.js`: explicitly enables Google and disables Facebook through the plugin's supported provider-selection configuration. Other provider defaults are unchanged.
- `mobile/android/gradle.properties`: persists `socialLogin.google.include=true` and `socialLogin.facebook.include=false` for direct Gradle builds and fresh dependency installs. The existing plugin selects its dependency-free Facebook stub instead of the real provider. No plugin source was patched and no replacement SDK or dependency upgrade was needed.
- `mobile/android/app/build.gradle`: version code **3 → 4**, version name **1.0.2 → 1.0.3**.
- `src/lib/auth-google-native.test.ts`: adds six checks of the existing native Google token-validation contract.
- `mobile/CLAUDE.md` and this report: document provider pinning and verification.

Capacitor sync regenerated the ignored native config/assets through its normal hook. Google client IDs, server audience validation, verified-email enforcement, account lookup, sessions, roles, package ID, signing key, hosted origin, user-agent marker, payments, upload permissions, camera behavior and URL routing are unchanged. No `AD_ID` removal marker was added to the app manifest: the permission disappeared because its dependency was removed.

## Artifact and dependency verification

Signed release APK and AAB built successfully. APK/AAB signatures and Google bundletool validation passed. Both archives contain identical DEX class sets; parsing class definitions found zero Facebook, Install Referrer, Google Mobile Ads, Firebase Analytics or Google Measurement classes. Known Advertising ID API/service references are absent. Some plugin availability-check strings and the plugin-namespace Facebook stub remain; those are not bundled Facebook SDK classes.

The release dependency graph retains `play-services-auth:21.4.0`, `credentials-play-services-auth:1.5.0` and `googleid:1.1.1`; it contains no Facebook, Install Referrer, advertising-ID or native analytics SDK. Required Google authorization, Credential Manager and Google ID-token classes are present. The compiled `GoogleProvider.class` SHA-256 is identical to the preceding release. Package name, signing certificate, canonical website URL, user-agent marker and packaged provider flags were verified.

The final AAB and release/debug merged manifests have no `com.google.android.gms.permission.AD_ID`, ad-services permissions, Install Referrer binding, or broad media/storage permission. The existing camera permission remains. No other native Advertising ID implementation was found in the resolved dependencies or packaged code. Conditional website analytics/marketing scripts remain separate and have no Android Advertising ID bridge in this app.

The new code-4 bundle supports a **No** Advertising ID declaration based on this audit. This does not change the contents of older bundles, including code 3, which still declares `AD_ID`. Check which artifact/tracks are active when updating Play Console. Other privacy/data-safety disclosures are unchanged.

## Tests and limitations

TypeScript, targeted ESLint, Capacitor config syntax and whitespace checks passed. A stale malformed ignored Next dev-type cache was preserved under `build/review/` and route types regenerated before the successful TypeScript check; no application code was changed to bypass that error.

All **60 tests across seven files** passed: six native Google authentication-contract tests plus current-role checks, admin authorization, middleware, prescription enforcement, shipping calculation and parcel validation. Native Google tests mock Google's verifier and database: they verify configured audiences, existing-account resolution, and rejection of invalid tokens, unverified/missing email, missing tokens and missing audience configuration. They do not replace a real Google account login.

No Android device was connected. The previous emulator installation had a different signing key; it was not uninstalled or cleared, and no new emulator session was started for this change. Real-device Google account selection, ID-token issuance, session establishment, OEM behavior, UPI/payment return and native upload interaction still require device checks. Google OAuth console settings and Play app-signing certificate registrations were not changed or independently verified. No real credentials were submitted, no chargeable deliveries/payments were created, no production data was changed, and no Play upload/approval was performed.

## Release files and evidence

Upload `mobile/android/app/build/outputs/bundle/release/app-release.aab`, also copied as `build/releases/pmstore-1.0.3.aab`. The release APK is in `apk/release/app-release.apk` and `build/releases/pmstore-1.0.3.apk`. Debug manifest verification does not mean an updated debug APK was built.

Ignored local evidence: `build/releases/google-only/` contains before/after manifests, dependency/build and sync logs, test output, the artifact audit and verifier. `build/releases/code4/` contains signature/bundle verification and the extracted AAB manifest. Metadata and checksums: `release-manifest-1.0.3.json`, `SHA256SUMS-1.0.3.txt`.

Reference: [Capgo's supported provider-selection configuration](https://github.com/Cap-go/capacitor-social-login#readme). The installed 8.3.39 Gradle source and hook were inspected directly before using this configuration.
