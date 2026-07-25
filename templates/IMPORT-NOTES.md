# Catalogue import notes

`product-import-template.csv` is the contract for `scripts/import-products.ts`. If the client's
export doesn't match, write a mapping layer in `scripts/mappers/` — do not change the template.

## Column rules

| Column | Rule |
|---|---|
| `sku` | Required, unique. The idempotency key — re-running the import updates by SKU |
| `salt_N_name` | Free text as printed on the pack. The importer normalizes it |
| `salt_N_strength` | Number only. No units in this field |
| `salt_N_unit` | One of `mg` `mcg` `g` `ml` `iu` `%` |
| `form` | One of the dosage forms in `docs/01-DATA-MODEL.md` |
| `pack_size` | Number of units in the pack: 15 tablets → `15`, 100 ml syrup → `100` |
| `price` | Selling price for the whole pack, in rupees. `unitPrice` is derived, never supplied |
| `prescription_required` | `TRUE` / `FALSE`. Must be `TRUE` for any Schedule H, H1 or X product |
| `schedule_class` | `OTC` `H` `H1` `X` `G` |
| `side_effects`, `contraindications` | Pipe-separated: `Nausea\|Rash\|Dizziness` |
| `image_url_N` | Public URL. The importer uploads to Cloudinary and rewrites the field |
| `tags` | Optional, pipe-separated internal labels (e.g. `price-unverified`). Not shown to customers as chips; used for filtering and SEO keyword fallback |

Add `salt_3_*` columns if a product has three salts. The importer reads them dynamically.

## Products with no salt data

`compositionKey` cannot be derived without at least one salt, and a product without one can never
appear in the Strip. Import those rows with `is_active` set to `FALSE` and work through them in
batches, top-selling SKUs first.

**Do not go live with active products missing composition data.** A comparison feature that
silently omits brands is worse than no comparison feature — the customer believes they've seen
every option and they haven't.

## After any bulk operation

```bash
npx tsx scripts/backfill-composition.ts
```

`insertMany`, `updateMany` and `findOneAndUpdate` all skip the Mongoose pre-save hook that derives
`compositionKey` and `unitPrice`. This script recomputes both and reports drift.
