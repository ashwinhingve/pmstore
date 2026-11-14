# Measured parcel shipping

## Admin workflow

Paid prepaid orders and confirmed COD orders now wait under **Admin → Shipments → Orders awaiting shipment**. The same parcel form appears on the order details page.

1. Pack and weigh the entire shipment, including packaging.
2. Enter the total weight **once, in grams**, plus the outside parcel length, width and height in centimetres. Do not enter the total once per product.
3. Select the courier and choose **Confirm parcel and estimate**. Delhivery estimates use Surface service and the order's payment details. An unavailable estimate is shown explicitly; check the courier dashboard before booking.
4. Review and choose **Book shipment**. Payment callbacks and retry workers cannot create courier shipments automatically. Local hand-delivery still works without courier measurements.

The customer delivery fee and paid order totals are unchanged. The courier estimate is a separate cost to the merchant. Delhivery's `total_amount` includes provider taxes; the website does not add tax to it again. Estimates are approximate and are not final wallet debits. Shiprocket estimates are not available in this UI. Verified final wallet/invoice costs can now be recorded separately through Actual courier billing; see ADMIN-DELIVERY-UPDATES.md.

## Configuration and failures

Configure `DELHIVERY_API_KEY`, the production `DELHIVERY_BASE_URL`, `DELHIVERY_RETURN_PINCODE`, and the exact registered warehouse `DELHIVERY_RETURN_NAME` on the server. Use the same account, origin/destination PINs, measured parcel, service, payment mode and COD collection amount when comparing the Delhivery dashboard.

The order stores the admin-confirmed parcel and booking claim; the shipment retains its booking measurements and available estimate. Legacy shipments have no fabricated measurement or cost. Product weights are optional and never determine courier booking weight; existing recorded product weights are preserved. ml/L are volume units and are not silently converted into shipping mass.

A `creating` or `uncertain` booking must be reconciled with the courier before retrying. Claims do not expire automatically: a network timeout may occur after a remote booking. Find the shipment by order reference in the courier dashboard. If it exists, reconcile its AWB into the website; if the provider confirms no shipment exists, an operator can clear the claim before a new admin booking. Never clear it or change courier solely because the request timed out.

## Implementation map

- `src/components/admin/CreateShipmentButton.tsx`: shared confirmation, estimate and booking form, used by order details and `ShipmentsTable`.
- `src/app/api/shipping/parcel/route.ts`: validate and persist measurements attributed to the authenticated admin; fetch estimates without booking. `shipping/create/route.ts` books using saved measurements and checks the admin's database role.
- `src/lib/shipping/createShipmentForOrder.ts`: `createShipmentForOrder` claims the booking atomically and snapshots the measured parcel; `createLocalShipmentForOrder` prevents payment callbacks and retry workers from booking couriers.
- `src/lib/shipping/delhivery.ts` and `shiprocket.ts`: send measured parcel dimensions and weight. `estimate.ts` handles the read-only Delhivery estimate; `parcel.ts` handles validation and mass conversion.
- `src/models/Order.ts`, `Shipment.ts`, and `shipping-fields.ts`: persist parcel confirmation, estimate, and booking state. `Product.ts`, product validation and `ProductForm` no longer default to 500 g.
- Payment callback, payment sync, shipment queue and checkout routes: defer courier booking and normalize known mass units for customer shipping calculations.

## Order ORD-MWEVN8RA-MQW8

Read-only database inspection reconstructed **3,650 g** from current product data: Dytor Plus 10 (2 × 500 g), Velmata 50 (2 × 500 g), Ecosprin Gold 20 (3 × 500 g), and Bisoduce 1.25 (3 × 50 g). The original payload was not retained, so this is a reconstruction, not a historical request log.

Existing Delhivery AWB: **59730810000140**, recorded as Pending at inspection. Customer shipping fee: **₹0**; COD collection: **₹1,162.80**. The owner reported a **₹89** courier debit and a corrected **200 g** parcel; neither a revised provider quote nor the wallet debit has been independently verified.

The owner reported handling the existing order correction; no provider-side correction was independently verified. Correct the existing AWB's declared weight to the measured packed weight in Delhivery One if its current status permits. Confirm dimensions and retain the same COD amount and Surface mode. Ask Delhivery to reconcile any wallet difference; changing website data cannot reverse an existing debit. Do not cancel or rebook without approval. No live courier correction, booking, cancellation, refund or production database edit was performed as part of this code change: local Delhivery credentials were absent.

References: [rate calculator](https://help.delhivery.com/docs/rate-calculator), [volumetric weight](https://help.delhivery.com/docs/calculating-volumetric-weight), [shipping charge API](https://delhivery-express-api-doc.readme.io/reference/invoice-shipping-charge-api), [payment-mode parameter](https://one.delhivery.com/developer-portal/document/b2c/detail/faq).
