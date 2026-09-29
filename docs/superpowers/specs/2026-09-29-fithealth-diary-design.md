# FitHealth diary: products, meals, day log and training-aware targets

Issue: #28, part of the FitHealth epic #26

## Intent

The core of FitHealth, in the spirit of Fitatu: log products into meals for a day and see calories and macros against daily targets.
Targets are calculated from a body profile and grow on days the user trains in FitTune, which is what makes FitTune and FitHealth one ecosystem.
The shared product database introduced here is the one barcode scan (#29) and label OCR (#30) fill later, so the product form must fit them.

Success means, on a phone:

- Open today, add a product to a meal by searching it, or create it when it is missing
- See the day's calories and macros against targets, including what today's training added
- Move between days, edit or remove entries
- Set up the body profile once and log weight now and then; targets follow

## Decisions

Confirmed by the owner:

- Nutrition is stored per 100 g, diary entries store grams
- The API follows the `places` module layout (`model`, `repo`, `routes`) inside a `health` module under `/api/v1/health`
- Targets are calculated from a body profile, not only typed in
- Training-aware targets: on days with FitTune workouts or activities the target grows by the estimated exercise calories
- The product database is shared by all users, no per-user copies, no moderation

Made by the implementer under the owner's "proceed without asking" instruction (review these):

- Meals are per user and editable (rename, add, reorder, delete); a new user gets a default set on first use: Breakfast, Second breakfast, Lunch, Snack, Dinner
- Default meal names are stored in English and translated on display through `t()`; a renamed meal shows exactly what the user typed
- Deleting a meal archives it: its past entries keep their meal, it disappears from days without entries and from the add flow; a user keeps at least one active meal
- Entries snapshot the product's name and per-100 g values when created or when their product changes, so later edits to a shared product never rewrite someone's history
- The activity level describes daily life without exercise, because exercise is added per day from FitTune; this avoids counting training twice
- Exercise calories are net of rest (MET minus 1), again to avoid double counting with the resting part of the energy formula
- Weight is logged by date and the latest weight on or before a day is used for that day's calculations
- Targets can be overridden per value (calories, protein, fat, carbs); an overridden calorie target still receives the training bonus
- The day's date is the user's local date; the client sends its IANA time zone like the stats endpoints do
- No barcode field in the UI yet, the column exists for #29

## Data model (`fittune-api`, one migration)

`food_products` (shared):

- `id` UUID, `name` TEXT (1..120), `brand` TEXT NULL (..80), `barcode` TEXT NULL UNIQUE (digits, 8..14)
- per 100 g, all `DOUBLE PRECISION` and `>= 0`: `energy_kcal` (required, `<= 900`), `protein_g`, `fat_g`, `carbs_g` (required, each `<= 100`), `saturated_fat_g`, `sugars_g`, `fiber_g`, `salt_g` (optional, each `<= 100`)
- checks: `saturated_fat_g <= fat_g`, `sugars_g <= carbs_g`, `protein_g + fat_g + carbs_g <= 100`
- `serving_g` NULL (`> 0`, `<= 2000`), `serving_name` TEXT NULL (..40, for example "1 slice")
- `source` TEXT `manual | off | ocr | ai`, `created_by`, `updated_by` UUID NULL references users `ON DELETE SET NULL`, timestamps
- energy in kJ is not stored, it is always `kcal * 4.184`

`diary_meals`: `id`, `user_id`, `name` (1..40), `position` INT, `archived_at` NULL, `created_at`

`diary_entries`: `id` (client generated, idempotent `PUT` like places and workouts), `user_id`, `date` DATE, `meal_id`, `product_id` NULL (`ON DELETE SET NULL`), `grams` (`> 0`, `<= 5000`), snapshot columns `product_name`, `product_brand`, `energy_kcal`, `protein_g`, `fat_g`, `carbs_g`, `saturated_fat_g`, `sugars_g`, `fiber_g`, `salt_g`, timestamps; index on `(user_id, date)`

`body_profiles`: `user_id` PK, `sex` `male | female`, `height_cm` (100..250), `activity` `sedentary | light | moderate | active | very_active`, `goal` `lose | maintain | gain`, `pace_kg_per_week` (0..1, 0 for maintain), overrides `energy_kcal`, `protein_g`, `fat_g`, `carbs_g` NULL, `updated_at`

`body_weights`: `(user_id, date)` PK, `weight_kg` (25..400), `updated_at`

## Targets (pure Rust, unit tested)

Inputs: profile, age from `users.birthday` on the day, the latest weight on or before the day, the day's exercise calories.

- BMR, Mifflin-St Jeor: `10 * kg + 6.25 * cm - 5 * age + (5 male | -161 female)`
- Daily life: `BMR * factor`, factors `1.2, 1.375, 1.55, 1.725, 1.9`
- Goal: `± pace * 7700 / 7` kcal per day (minus for lose, plus for gain)
- Floor: never below `1200` kcal before the training bonus
- Training bonus: the day's exercise calories, added after the floor
- Macros: protein `2.0 g/kg` when losing, `1.8 g/kg` otherwise; fat 25% of calories but at least `0.6 g/kg`; carbs take the rest, never below 0
- Overrides replace the calculated calories or macro; macros are recalculated from an overridden calorie total unless overridden themselves; the training bonus goes to carbs
- Missing birthday, profile or weight: no calculated target, the response says what is missing; overrides alone still produce targets

Exercise calories for a local day (pure Rust, unit tested):

- Activities: the recorded `calories` when present, otherwise `(MET - 1) * kg * hours` with MET by kind: run from speed (`km/h`, between 6 and 18) or 9.8 without distance, ride 7.5, walk 3.5, hike 6.0, swim 7.0, row 7.0, other 5.0
- Finished strength workouts: `(5.0 - 1) * kg * hours`, duration capped at 3 hours
- Without a weight on or before the day, exercise estimates are 0 and the response says so

## API (`/api/v1/health`)

| Method | Path | Result |
| --- | --- | --- |
| GET | `/products?q=&limit=20` | `Product[]`, name or brand contains `q` (case-insensitive), recently used by the user first, then by name |
| GET | `/products/{id}` | `Product` |
| POST | `/products` | `201 Product`, `source = manual` |
| PUT | `/products/{id}` | `Product`, any user may edit, `updated_by` records who |
| GET | `/meals` | active meals in order, creates the defaults on first call |
| POST | `/meals` | `201 Meal`, appended at the end, at most 10 active meals |
| PATCH | `/meals/{id}` | rename |
| PUT | `/meals/order` | `{ ids: [...] }`, must list every active meal exactly once |
| DELETE | `/meals/{id}` | `204`, archives, `409` when it is the last active meal |
| GET | `/days/{date}?tz=` | the day: meals with entries, totals, targets and exercise |
| PUT | `/entries/{id}` | create (`201`) or update (`200`): `date`, `meal_id`, `product_id`, `grams` |
| DELETE | `/entries/{id}` | `204` |
| GET, PUT | `/profile` | body profile and overrides, `GET` returns `null` fields before setup |
| GET | `/weights?limit=30` | newest first |
| PUT, DELETE | `/weights/{date}` | upsert or remove one day's weight |

Entries only reference the caller's own meals; a product must exist; the entry keeps working if the product is deleted later.

## App (`fittune-app`)

Routes under `/health`, all behind the existing online-only gate:

- `/health` (Diary): date bar (previous, next, today), a summary card with calories eaten versus target and protein, fat and carbs bars, a line for today's training bonus, then each meal with its entries and an add button
- Adding: a bottom sheet with product search (debounced), results with kcal per 100 g, then a grams step with live calories and macros and a serving shortcut when the product has one; "Create product" opens the product form and continues to the grams step
- Tapping an entry: edit grams, move to another meal, delete
- `/health/goals` (Goals): body profile form, weight log, calculated targets with the formula inputs shown and per-value overrides, and the meal editor
- Missing birthday links to Profile
- Navigation: mobile Diary, Goals, Profile; desktop "Nutrition" with Diary and Goals

Client structure: `fithealth` client methods in `src/api/fithealth.ts`, query options in `src/api/health.ts` with keys starting `"health"` (already kept out of the offline cache), zod schemas in `src/schemas/health.ts`, feature code in `src/features/health/`.

## Testing

- Rust unit tests: BMR, targets with goals, floor, overrides and missing inputs; exercise estimates for every activity kind, recorded calories, workouts, caps and missing weight
- API integration tests: product create, validation and search; meals defaults, rename, reorder, archive rules; entries create, update, snapshot, cross-user isolation; day totals and targets with a workout and an activity in the user's time zone; profile and weights
- App: unit tests for nutrient scaling and summary maths, component tests for the add flow and the goals form, the online gate stays covered
- Browser walkthrough on phone and desktop sizes, light and dark

## Out of scope

- Barcode scan (#29) and label OCR (#30)
- Recipes, copying meals or days, water, micronutrients beyond the label set
- Syncing targets or weights back into FitTune screens
