# Android photo and video permissions fix

## Root cause and source trace

The version-code-2 release AAB declared `READ_MEDIA_IMAGES`. The release manifest-merger report and blame report attribute it directly to `mobile/android/app/src/main/AndroidManifest.xml:37`; it was not injected by a plugin. `READ_MEDIA_VIDEO` was absent from both that merged manifest and the extracted code-2 AAB manifest. The evidence does not identify any current source of a video permission; an older Play artifact may differ and was not available for inspection.

The active native plugins are Capacitor Android 8.4.2, App, Browser, Splash Screen, Status Bar and Capgo Social Login 8.3.39. Their merged dependency manifests introduced no broad media/storage permission in this release. CapacitorHttp contains legacy storage permission aliases in Java annotations, but they do not declare permissions in the merged manifest and the website does not call that native API for uploads.

Before/after merger reports, blame reports and the old extracted AAB manifest are preserved under ignored `build/releases/media-permissions/`.

## Upload mechanism and changes

PrescriptionUpload, product ImageUploader, replacement image inputs and bulk image inputs already use HTML file inputs. Capacitor's `BridgeWebChromeClient.onShowFileChooser()` sends non-capture inputs through `showFilePicker()`, which calls Android `FileChooserParams.createIntent()`, retains multiple selection and MIME constraints, and returns selected URIs to the WebView. These uploads need selected-file access, not a readable media library. No custom gallery or new plugin is necessary.

- App manifest: replaced the broad image declaration with `tools:node="remove"` exclusions for `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE`. This also prevents a dependency from reintroducing these permissions during merging.
- Existing `CAMERA`, optional camera hardware, FileProvider configuration and Capacitor capture/cancellation behavior are preserved explicitly. No new permissions, JS bridges, storage grants or authentication exceptions were added.
- Gradle: version code **2 → 3**, version name **1.0.1 → 1.0.2**.
- Mobile contributor documentation now describes the system chooser and current permissions.
- Website upload code, type/size limits, prescription privacy controls, role checks, payment routing and other app behavior are unchanged.

## Release verification

Release APK/AAB and a debug APK built successfully. Release and debug merged manifests and the extracted final AAB manifest contain none of `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` or `MANAGE_EXTERNAL_STORAGE`. The existing camera permission remains. APK/AAB signatures passed, Google bundletool 1.18.1 validation passed, and version 3 and the original release certificate were verified. Verification output is in `build/releases/code3/`; hashes and metadata are in `SHA256SUMS-1.0.2.txt` and `release-manifest-1.0.2.json`.

Play upload: `mobile/android/app/build/outputs/bundle/release/app-release.aab`, also copied to `build/releases/pmstore-1.0.2.aab`. The corresponding signed APK is in the normal `apk/release/` output and `build/releases/pmstore-1.0.2.apk`. Older named release files remain for reference and should not be uploaded for this fix.

## Upload checks

Browser checks passed at 390px and 1440px: prescription multi-image selection, cancellation without uploading, successful multipart submission, admin image addition and replacement of the existing image. Storage upload and image-deletion responses were mocked; no patient data or live Cloudinary assets were created or deleted. Browser file-chooser interception is not a test of Android's native chooser UI.

Temporary-server authorization checks returned 401 for anonymous prescription/product uploads and 403 for a customer attempting admin image upload. All 14 existing prescription-enforcement tests passed. The source changes contain no website or backend modifications.

## Testing limits

The available API-36 emulator booted, but its existing PM Store installation is signed with a different key and rejected the debug upgrade. It was not uninstalled or cleared. Native chooser interaction, OEM variants, Android 24–35 devices and camera capture therefore require device testing. No physical device was connected. No release was uploaded to Play Console. Existing Play releases still containing the permission must be reviewed separately; local verification does not confirm Play approval or modify declarations.

References: [Google Play photo/video permission policy](https://support.google.com/googleplay/android-developer/answer/16558241), [Android FileChooserParams API](https://developer.android.com/reference/android/webkit/WebChromeClient.FileChooserParams), [Android minimum-permission guidance](https://developer.android.com/privacy-and-security/minimize-permission-requests).
