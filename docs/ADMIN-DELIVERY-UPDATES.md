# Admin access, mobile controls and delivery offers

## Findings and changes

- The owner-confirmed Employment Corner account was email-verified but had role `client`. Only that exact account was promoted to `admin` and read back for verification. Authentication, middleware gates and database authorization checks remain enabled. Existing tokens need a session refresh or fresh sign-in; web sessions now refresh the database role and never accept a role from a client update. Failed role reads cannot retain admin privileges.
- The account dropdown had unconstrained intrinsic width and positioning inside the header. Its panel now renders in a portal, clamps its dimensions to the visual viewport, scrolls vertically when needed, and supports keyboard and touch dismissal. Long emails wrap.
- On mobile My Orders, browser hit-testing reproduced the floating WhatsApp control intercepting taps on the right edge of **View details**. Mobile order pages now provide an inline chat link instead. View/track actions are single accessible links, with no nested button. Order-number wrapping and pagination response handling were also corrected.
- The moving banner ignored saved announcements. It now uses managed settings. A one-time merge preserves both saved messages and the previously visible promotions. Reduced-motion preference updates use a hydration-safe media subscription, with a scrollable static row. The location offer message appears only when the offer has valid active eligibility rules and promotion is enabled.

## Configure free delivery

Open **Admin → Settings → Delivery locations and free delivery**.

1. Register the physical pickup in the courier dashboard first.
2. Add its address, origin PIN, contact phone and exact registered courier warehouse name. Map a separate Shiprocket name when that provider is used.
3. Select one active default dispatch location. Customers continue selecting their delivery address; the store chooses the origin.
4. Enter eligible destination PINs for that pickup, enable the offer and save. No new location or destination eligibility is hardcoded. The new offer starts disabled.
5. Edit the qualified announcement text and promotion toggle. The existing announcement banner toggle still controls the whole strip.

Existing free local delivery and the ₹499 threshold remain. Below those benefits, matching location rules waive the delivery fee once; other orders use the existing normal fee formula. That formula is the store's customer-fee policy, not a live Delhivery tariff. Checkout estimates and order creation use the same backend evaluator and owned address/product records. If a fee changes before order creation, the customer must review it before continuing.

Orders retain their customer fee, delivery reason and pickup snapshot. Later changes to rules, warehouse addresses or default origin affect new orders, not paid totals or existing bookings. Local hand-delivery is specific to the existing store origin. Courier manifestation, estimates and pickup requests use the snapshotted warehouse; different warehouses do not share pickup requests.

## Record actual partner costs

Open an order with a courier shipment and use **Actual courier billing**. Enter the verified amount, wallet/invoice reference, charge date and paid/unpaid status. Confirm the verification checkbox before saving.

The actual partner charge is separate from the estimate and `Order.shippingCost`, which remains the customer's delivery fee. Unknown charges remain pending. Billing edits retain an administrator/time history and reject stale simultaneous updates. Legacy shipment documents do not synthesize billing defaults on load, preventing an older tracking save from overwriting a concurrently recorded charge. Recording a charge does not initiate a payment, debit a wallet again, alter customer totals, or change COD collection. The business pays through its existing courier account; unpaid invoices still require normal settlement.

## Implementation map

- Access: `src/lib/auth-role.ts`, `src/lib/auth.ts`, `src/components/providers/SessionProvider.tsx`.
- Mobile UI: `src/components/ui/dropdown-menu.tsx`, `src/components/layout/Header.tsx`, `src/lib/utils/menu-position.ts`, `src/app/(shop)/orders/page.tsx`, `src/components/shared/WhatsAppButton.tsx`.
- Policy: `src/lib/shipping/delivery-policy.ts`, SiteSettings and shared delivery schemas, admin settings editor/API.
- Checkout: shared `delivery-quote.ts`, estimate/create-order routes, address selection and checkout summary.
- Fulfilment: order/shipment snapshots, Delhivery/Shiprocket payloads, estimate origin and warehouse-specific pickup reuse.
- Costs: `src/lib/validations/partner-billing.ts`, `src/app/api/admin/shipments/[id]/billing/route.ts`, `src/models/Shipment.ts`, `src/components/admin/PartnerBillingForm.tsx`, `ShipmentsTable.tsx`, `OrderDetailsCard.tsx`.
- Promotions: `src/lib/site-settings.ts`, `src/app/layout.tsx`, `src/components/layout/AnnouncementBar.tsx`, `src/components/admin/AnnouncementManager.tsx` and settings initialization migration.

## Verification boundaries

Automated integration and browser checks use temporary databases, synthetic users/orders, and mocked courier calls. No live chargeable booking is needed. Google OAuth for the real account requires its holder's fresh sign-in. Actual rates and wallet debits require real courier credentials and verified billing records. Eligible destination PINs and registered pickup details must be supplied through admin settings before activating the new offer.

## Validation results

- Vitest: 604 tests across 77 files passed, including legacy shipment billing concurrency, prepaid/COD courier payloads, booking claims, pickup isolation, checkout policy, stale quotes and authorization.
- TypeScript and design-token checks passed. ESLint reported no errors; existing unrelated warnings remain.
- Browser tests cover 320, 360, 390, 768, 1024 and 1440 px, menu bounds/focus/touch, order-link hit testing and ownership protection.
- Signed Android APK and AAB: `build/releases/`; signatures verified and AAB validated with official Google bundletool. The wrapper loads the hosted site, which must be deployed for web changes to appear.

Final production-browser run passed all nine groups with no page errors, including changing reduced-motion preference and reloading. Synthetic checkout: the same destination cost ₹90 with the new offer disabled and ₹0 when eligible; a non-eligible destination remained ₹90. The created eligible order retained fee ₹0 after the offer was disabled. In a separate synthetic billing case, recording a verified partner charge of ₹89 left the customer fee ₹30 and total ₹130 unchanged. These are test fixtures, not a live courier tariff or a reconciliation of the reported real ₹89 debit.
