# Play Store Submission Checklist

This checklist covers everything needed to submit PMStore to the Google Play Store.

## Account & Legal

- [ ] Google Play Developer account created (₹2,499 one-time fee)
- [ ] Account is in the **client's name**, not the developer's
- [ ] Verify account payment method is set
- [ ] Tax information and payout account configured

## Privacy & Data Protection

- [ ] Privacy policy published at `https://pratigyamedicalstore.com/privacy`
  - [ ] Includes statement: "Prescription images are collected for verification purposes"
  - [ ] Includes data retention policy (e.g., "Prescriptions retained for 12 months")
  - [ ] Includes data deletion request process
  - [ ] Covers HIPAA/PDPA compliance (India)
  - [ ] Contact email for data requests: `pmstoremedicine@gmail.com`

- [ ] Terms of Service at `https://pratigyamedicalstore.com/terms`
  - [ ] Includes disclaimer that app is not a substitute for professional medical advice
  - [ ] Liability limitations
  - [ ] Prescription verification statement

## Data Safety Form

In Google Play Console, **Data Safety** tab:

### Sensitive Permissions & Data

- [ ] **Prescription Images**
  - [ ] Mark as "Collected"
  - [ ] Category: "Sensitive health information"
  - [ ] Purpose: "Prescription verification for order fulfillment"
  - [ ] User accessible: Yes (users can delete their prescriptions)
  - [ ] Sold/shared: No
  - [ ] Deleted on uninstall: Yes

- [ ] **Email Address**
  - [ ] Mark as "Collected"
  - [ ] Category: "Personal information"
  - [ ] Purpose: "Account authentication and order communication"

- [ ] **Phone Number** (if used for OTP)
  - [ ] Mark as "Collected" (even if deferred to v2)
  - [ ] Category: "Personal information"
  - [ ] Purpose: "Account verification (future SMS OTP)"

- [ ] **Camera**
  - [ ] Purpose: "Prescription photo capture"
  - [ ] Required: No (can use gallery)

- [ ] **Photo Library**
  - [ ] Purpose: "Select prescription images from gallery"
  - [ ] Required: No (can use camera)

- [ ] **Device Photos/Files**
  - [ ] Purpose: "Temporary storage during image compression"
  - [ ] Required: No (auto-deleted after upload)

### Security Practices

- [ ] HTTPS enforcement: Yes (all API calls use HTTPS)
- [ ] Encryption in transit: Yes (TLS 1.2+)
- [ ] Encryption at rest: Yes (expo-secure-store for tokens)
- [ ] Security testing: Describe any pen testing or security audit

### Data Access & Sharing

- [ ] Do you sell/share personal data? **No**
- [ ] Do you transfer data internationally? **No** (data stays in India)
- [ ] Is data shared with third parties? **No** (except payment gateway for transactions)
  - [ ] If payment gateway: State which gateway and that it's only for payment processing

## Content Rating

In Google Play Console, **Content Rating** tab:

Fill out IARC questionnaire:

- [ ] **Objectionable content**: None
- [ ] **Violence**: None
- [ ] **Sexual content**: None
- [ ] **Profanity**: None
- [ ] **Alcohol/tobacco/drugs**: Mention in context (medicine packaging images)
- [ ] **Gambling**: None
- [ ] **Ads/in-app purchases**: None
- [ ] **App Category**: "Utilities" or "Health"

Expected rating: **Suitable for all ages** (or PEGI 3 if European submission).

## Target Content & Audience

- [ ] Target audience: 18+ (can use medicine app)
- [ ] Pharmacy/health category selected
- [ ] Country release: India primary

## App Store Listing

### Graphics & Branding

- [ ] App icon: 512x512 PNG (uploaded in `assets/icon.png`)
- [ ] Feature graphic: 1024x500 PNG (if used for promotional banner)
- [ ] Screenshots (minimum 2, maximum 8):
  - [ ] Login screen
  - [ ] Search results
  - [ ] Product detail with price comparison
  - [ ] Cart
  - [ ] Checkout
  - [ ] Order confirmation
  - [ ] Order tracking
  - [ ] Account/profile

  Tips for screenshots:
  - Include text overlays explaining features
  - Show prescription verification flow
  - Highlight price comparison and savings

### App Title & Description

- [ ] App title: "PMStore" (match `app.json`)
- [ ] Short description (max 80 chars):
  ```
  Buy medicines with price comparison & home delivery.
  ```

- [ ] Full description (max 4000 chars):
  ```
  PMStore is an online pharmacy app for Pratigya Medical Store.
  
  Features:
  • Search medicines by brand or composition
  • Price comparison — find the cheapest alternative
  • Compare all pack sizes (tablets, capsules, syrups, etc.)
  • Secure prescription upload for Schedule H medications
  • Fast checkout with Cash on Delivery
  • Order tracking and one-tap reorder
  • Saved medicines for quick reordering
  
  Prescription Safety:
  • Prescription images encrypted and stored securely
  • Schedule H, H1, X medicines require verified prescription
  • Same-day verification (typically 1–2 hours)
  
  How it works:
  1. Search for your medicine
  2. Compare prices and pack sizes
  3. Add to cart and checkout
  4. For prescription medicines, upload a clear prescription photo
  5. Receive your order with home delivery
  
  Questions? Contact: pmstoremedicine@gmail.com
  ```

## Technical Requirements

### App Signing & Distribution

- [ ] App Bundle (AAB) built and signed by EAS
- [ ] API level:
  - [ ] Target API level: 34 (set in `app.json`)
  - [ ] Minimum SDK: 21 (Android 5.0)

- [ ] Permissions declared:
  - [ ] `android.permission.CAMERA`
  - [ ] `android.permission.READ_EXTERNAL_STORAGE`
  - [ ] `android.permission.WRITE_EXTERNAL_STORAGE`
  - [ ] `com.google.android.c2dm.permission.RECEIVE` (FCM)

### Testing

- [ ] Tested on Android 9 (API 28, low-end device if possible)
- [ ] Tested on Android 12 (API 31, mid-range)
- [ ] Tested on Android 15 (API 35, latest)

- [ ] Full flow tested:
  - [ ] Install and first launch
  - [ ] OTP login
  - [ ] Search for medicines
  - [ ] View product with alternatives
  - [ ] Add to cart
  - [ ] Checkout with Cash on Delivery
  - [ ] Order confirmation
  - [ ] View order in Orders tab

## Release Notes

For the initial release (v1.0.0):

```
Welcome to PMStore!

What's new:
• Search and discover medicines by brand or active ingredient
• Price comparison across pack sizes (never overpay for medicine)
• Secure prescription upload for prescription-required medicines
• Fast checkout with Cash on Delivery
• Order tracking and one-tap reorder for repeat purchases
• Account management with saved addresses and medicines

Privacy & Security:
• Prescription images encrypted and stored securely on HIPAA-compliant servers
• All data transmitted via HTTPS
• Auth tokens stored in encrypted device storage
• No data sharing with third parties

Supported devices: Android 5.0+

Questions? Email: pmstoremedicine@gmail.com
```

## Expected Review Timeline

- **Initial Review**: 2–5 business days
- **Health App Rejection** (very likely on first submission):
  - Health apps get extra scrutiny from Google
  - Expect to be asked about:
    - Prescription verification process
    - HIPAA compliance / data security
    - Medical claims or disclaimers
  - Response time: 1–2 business days
- **Re-review after rejection**: 2–5 business days
- **Total**: Budget 1–2 weeks for first approval

### Common Rejection Reasons (Health Apps)

1. **Prescription Handling**
   - Google wants to confirm the app doesn't diagnose or replace a doctor
   - Response: "We only facilitate purchase of medications with valid prescriptions verified by our pharmacist"

2. **Data Security**
   - Google checks encryption and data handling
   - Response: Point to privacy policy, encryption, and data retention limits

3. **Medical Claims**
   - Any language suggesting the app treats, cures, or prevents disease
   - Response: Ensure copy only describes what the app does (facilitates purchases)

4. **Licensing**
   - Provide pharmacy license number and proof of operation
   - Response: Include screenshot of license in listing or provide to Google on request

## Post-Approval

- [ ] Version published to production
- [ ] Update Play Store link on website: `https://play.google.com/store/apps/details?id=com.pratigyamedicalstore.app`
- [ ] Notify existing customers to download
- [ ] Monitor crash reports in Play Console for first week
- [ ] Respond to user reviews promptly
- [ ] Plan for v1.1 updates (SMS OTP, additional features, etc.)

## Important Notes

**Ownership**: This listing must be created and owned by the client (Pratigya Medical Store), not by the developer. The client's Google Play Developer account is the authoritative owner. This prevents issues if the developer relationship changes.

**No Transfer**: Existing ratings, reviews, and install count do NOT transfer between apps or accounts. This is a fresh launch.

**Rating Predictions**: Based on health category and pharmacy app precedent, expect 4–4.5 stars average (pharmacy apps are popular, but medical accuracy concerns lead to some 2–3 star reviews).

**Updates**: The client can update the app listing and version independently via their Play Console account.
