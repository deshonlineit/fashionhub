# FashionHub Catalog Seed

Current backend phase: `0.2.0-dev`.

This phase imports the existing storefront catalog from `data/home.json` into MySQL without changing the current frontend rendering yet.

## Goals

- Preserve the current numeric product IDs so existing cart/product references do not break.
- Import all current storefront categories and any extra product categories inferred from the product data.
- Import physical/digital product type, department, prices, sale prices, stock defaults, descriptions, feature lists, rating/review data, badges, images and SEO metadata.
- Keep the seed repeatable for development.
- Record each import in `fh_catalog_imports` with a SHA-256 hash of `data/home.json`.

## First-time setup

1. Create a MySQL database named `fashionhub`.
2. Copy `includes/config.example.php` to `includes/config.php` if your database credentials differ from the XAMPP defaults.
3. Import `database/schema.sql` in phpMyAdmin, or with the MySQL CLI.

## Import the current storefront catalog

From the FashionHub project root:

```bash
php database/seed-catalog.php
```

On Windows/XAMPP, if `php` is not in PATH:

```text
C:\xampp\php\php.exe database\seed-catalog.php
```

The importer reads `data/home.json` directly, so it always seeds the exact catalog bundled with the current checkout of the project.

The importer is CLI-only. It is intentionally not exposed as a public web action.

## Existing 0.1.x database

You do not need to recreate the database.

`database/seed-catalog.php` checks the current schema and automatically adds the `0.2.x` catalog fields if they are missing:

- `fh_products.department`
- `fh_products.features_json`
- `fh_catalog_imports`

For a fresh installation, the same fields already exist in the current `database/schema.sql`.

## What gets imported

For each product from `data/home.json`:

- `id` is preserved exactly.
- SKU becomes `FH-0001`, `FH-0002`, etc.
- slug is generated from the product name.
- `price` / `oldPrice` become `sale_price` / `regular_price` correctly.
- physical products use managed stock with a development stock quantity of `50`.
- digital products are marked downloadable and do not use managed stock.
- source feature lists are stored as JSON text and returned by `/api/v1/products/`.
- the source product image becomes the main image and first gallery image.
- exclusive product IDs are marked featured.

The seed is development data. Re-running it intentionally refreshes the seeded product fields from `data/home.json`.

## Verify the import

Run:

```bash
php database/verify-catalog.php
```

The verifier checks:

- every source product ID exists in MySQL;
- names and prices match;
- categories are assigned;
- main images exist;
- source and database product counts match;
- an import-history row exists.

A successful result ends with:

```text
PASS: the database catalog matches data/home.json.
```

## Browser/API checks

After seeding, these endpoints can be opened through Apache/XAMPP:

```text
/api/v1/health/
/api/v1/catalog/status/
/api/v1/products/
/api/v1/categories/
```

Example local URLs:

```text
http://localhost/fashionhub/api/v1/catalog/status/
http://localhost/fashionhub/api/v1/products/?limit=5
```

`/api/v1/catalog/status/` shows the database counts and the most recent catalog import record.

## Next phase

`0.3.x-dev` will connect the existing Vanilla JS storefront to these database APIs while preserving the current visual design and keeping the bundled data only as a controlled development fallback.
