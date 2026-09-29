# FitHealth barcode scan with Open Food Facts

Issue: #29, part of the FitHealth epic #26

## Intent

Scan a product's barcode while adding food and get its nutrition without typing: from FitHealth's own products, otherwise from Open Food Facts (OFF), confirmed once and then instant for everyone.
Imported OFF products also make the diary's product search find real supermarket products without scanning.

Success means, on a phone:

- A known barcode goes straight to the amount step, two taps from logging
- A barcode OFF knows opens the product form prefilled; one confirm saves it for everyone
- An unknown barcode opens the product form with the barcode filled in
- Search finds products by name with typos and partial words, across our products and the imported ones
- No camera or no permission still works by typing the barcode

## Decisions

Confirmed by the owner:

- Import the OFF CSV export, not the MongoDB dump: one streamed pass, every field needed, names already in the product's main language
- Import only products sold in Poland, Germany or Czechia that have a barcode, a name, energy, protein, fat and carbohydrate, so the database stays lean
- Keep imported products in their own table, apart from products users create or edit
- Import once from the export the owner downloaded; no scheduled refresh and no live OFF API, FitHealth never depends on OFF being up
- A newer export can be loaded later by running the same command again
- Typo-tolerant name search with `pg_trgm`
- No pgvector: semantic similarity is not worth an embedding model and ~1 GB of vectors here; OFF's `main_category` is stored instead, so a later "similar or healthier products" feature can use category plus nutrition in plain SQL
- Products added by users are not contributed back to OFF

Made by the implementer (review these):

- A scanned or searched OFF product becomes a FitHealth product only when the user confirms it (`source = off`, with the barcode); after that the FitHealth product wins every lookup for that barcode
- Barcodes are validated (8, 12, 13 or 14 digits with a correct GS1 check digit) before any lookup; UPC-A is stored as its EAN-13 form (leading zero) so both scans of one product match
- ODbL attribution: every product from OFF shows "Data from Open Food Facts (ODbL)" with a link, in the product form, the amount step and search results

## Data (`fittune-api`, one migration)

- `CREATE EXTENSION IF NOT EXISTS pg_trgm` (a standard contrib extension, available in the official Postgres image)
- `off_products`: `barcode` TEXT PK, `name`, `brand` NULL, `main_category` NULL, per-100 g `energy_kcal`, `protein_g`, `fat_g`, `carbs_g` (required), `saturated_fat_g`, `sugars_g`, `fiber_g`, `salt_g` (NULL), `serving_g` NULL, `serving_name` NULL, `off_modified_at`, `imported_at`
- Rows that break the same label rules as `food_products` (values above 100 g, sugars above carbohydrate and so on) are skipped by the importer rather than repaired
- Trigram GIN indexes on `lower(name)` and `lower(brand)` for both `off_products` and `food_products`

## Import (`fittune-api import-off`)

- A subcommand of the API binary, like `seed-dev`: `fittune-api import-off <path>` reads a local `.csv` (or `.csv.gz`), streamed row by row so the ~10 GB file never sits in memory
- Run once locally and once on the VPS after copying the file there; the README has the exact commands
- Columns are found by header name, so OFF adding or reordering columns does not break it
- Filters: `countries_tags` contains `en:poland`, `en:germany` or `en:czech-republic`; required fields present; barcode valid; values pass the label rules; `energy-kcal_100g` used, or `energy_100g` (kJ) divided by 4.184 when only that is given
- Writes into a staging table with `COPY`, then swaps it in within one transaction (`TRUNCATE` + `INSERT ... SELECT`), so searches never see a half-imported table and a failed import leaves the old data untouched
- Reports rows read, kept, and skipped by reason

## API (`/api/v1/health`)

| Method | Path | Result |
| --- | --- | --- |
| GET | `/products/barcode/{code}` | `{ status: "found", product }` from `food_products`, `{ status: "off", candidate }` from `off_products`, `{ status: "not_found" }`, or `422` for an invalid barcode |
| GET | `/products?q=` | now also matches `off_products`, ranked by trigram similarity; results carry `source` and OFF results carry no `id` yet |
| POST | `/products` | accepts optional `barcode` and `source` (`manual` or `off`); `409` with the existing product when the barcode is taken |

- A `candidate` has the product form's fields (name, brand, per-100 g values, serving, barcode) plus `main_category`, but no id
- Search returns our products first when they score the same as OFF ones, and never an OFF row whose barcode already exists in `food_products`

## App (`fittune-app`)

- The add-food dialog gets a "Scan barcode" button next to search
- Scanner: camera preview with `BarcodeDetector` where the browser has it (Chrome on Android), otherwise the `barcode-detector` polyfill (zxing-wasm), loaded lazily only when the scanner opens; EAN-13, EAN-8, UPC-A and UPC-E formats
- Camera missing or permission denied: the scanner turns into a barcode text field with the reason
- Result routing: `found` goes to the amount step; `off` and `not_found` open the product form prefilled (barcode always, OFF values when present); saving continues to the amount step
- Search results from OFF pick through the same confirm step as a scan
- OFF attribution shown wherever OFF data is on screen

## Testing

- Rust unit tests: barcode validation and UPC normalisation, OFF CSV row mapping (kJ fallback, missing optional values, rule violations, country filter)
- API integration tests: found in our products, found in the import, our product winning over the import for the same barcode, not found, invalid barcode, search ranking across both tables, creating with a taken barcode
- Import test on a small fixture CSV: filtering, the staging swap, and that a failed import keeps the previous rows
- App: scanner fallback to manual entry, result routing for each status, attribution shown for OFF data
- Browser check on phone and desktop sizes; camera scanning checked on a real phone before merge

## Out of scope

- Label OCR (#30)
- Contributing products to OFF
- Live OFF API lookups and scheduled refreshes
- Semantic or "healthier alternative" suggestions
