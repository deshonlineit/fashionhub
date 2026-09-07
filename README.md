# FashionHub

FashionHub is a responsive ecommerce storefront for physical and digital products built with plain HTML, modern CSS, Vanilla JavaScript, Core PHP and MySQL/MariaDB. No frontend framework, CMS or external font dependency is required.

Current development version: **0.3.0-dev**

Version history is maintained in [`CHANGELOG.md`](CHANGELOG.md). The development sequence is documented in [`docs/DEVELOPMENT-ROADMAP.md`](docs/DEVELOPMENT-ROADMAP.md).

## Current status

The catalog is now **MySQL-first**. After the database has been seeded, the homepage and secondary storefront pages load current product/category data from `/api/v1/storefront/` before rendering. The bundled JSON/JavaScript data remains available as a controlled fallback so a temporary database/API failure does not destroy the storefront UI.

Completed backend work:

- Core PHP bootstrap and PDO MySQL connection.
- Versioned JSON catalog API.
- Product/category/attribute/variation database schema.
- Deterministic catalog import from `data/home.json`.
- Preserved numeric product IDs.
- Catalog verification tooling.
- Catalog import history with source SHA-256.
- Product API support for department, price, sale price, features, stock, images and SEO data.
- Database-backed storefront compatibility payload.
- Homepage MySQL bridge without duplicating the existing UI renderer.
- Secondary-page API bootstrap that loads database data before the existing page runtime.

The next phase (`0.4.x-dev`) moves cart authority from localStorage to PHP sessions with server-side stock validation.

## Current storefront

- Responsive homepage and secondary pages.
- Physical and digital products sourced from MySQL when available.
- Product/category/search/archive pages.
- Single product page.
- Wishlist and cart drawer.
- Full cart and checkout UI.
- WooCommerce-style customer account UI.
- Desktop and mobile navigation.
- Multi-level category browser.
- Infinite product/category/review/hero sliders.
- Clean extensionless public URLs through Apache rewrite rules.
- Local WebP images and system fonts only.

## XAMPP setup

Recommended local path:

```text
C:\xampp\htdocs\fashionhub
```

Start Apache + MySQL and open:

```text
http://localhost/fashionhub/
```

Create a MySQL database named:

```text
fashionhub
```

For a fresh database, import:

```text
database/schema.sql
```

If your database credentials differ from the XAMPP defaults, copy:

```text
includes/config.example.php
```

to:

```text
includes/config.php
```

`includes/config.php` is environment-specific and should not be committed.

Detailed setup: [`docs/BACKEND-SETUP.md`](docs/BACKEND-SETUP.md).

## Seed the current storefront catalog

From the FashionHub project root:

```bash
php database/seed-catalog.php
php database/verify-catalog.php
```

On Windows/XAMPP, if `php` is not in PATH:

```text
C:\xampp\php\php.exe database\seed-catalog.php
C:\xampp\php\php.exe database\verify-catalog.php
```

The importer reads the current `data/home.json`, preserves product IDs, creates/updates categories and products, adds current product images and records an import-history row.

Detailed import documentation: [`docs/CATALOG-SEED.md`](docs/CATALOG-SEED.md).

## Storefront database connection

The primary UI payload is now:

```text
GET /api/v1/storefront/
```

It combines MySQL catalog data with the existing static merchandising/presentation content so the current frontend design does not need to be rewritten during migration.

Local check:

```text
http://localhost/fashionhub/api/v1/storefront/
```

After loading any storefront page, this browser-console value should normally be `mysql`:

```js
document.documentElement.dataset.catalogSource
```

If the API/database is unavailable, it becomes `fallback` and the bundled data is used.

Full details: [`docs/STOREFRONT-API.md`](docs/STOREFRONT-API.md).

## API v1

Available catalog endpoints:

```text
GET /api/v1/health/
GET /api/v1/catalog/status/
GET /api/v1/storefront/
GET /api/v1/products/
GET /api/v1/categories/
```

Examples:

```text
/api/v1/products/?category=women
/api/v1/products/?slug=heritage-leather-handbag
/api/v1/products/?search=dress&page=1&limit=24
/api/v1/categories/?tree=1
```

Local checks:

```text
http://localhost/fashionhub/api/v1/health/
http://localhost/fashionhub/api/v1/catalog/status/
http://localhost/fashionhub/api/v1/storefront/
http://localhost/fashionhub/api/v1/products/?limit=5
```

API query parameters are internal data-access parameters. Customer-facing storefront URLs remain clean and extensionless.

## Public storefront URLs

Examples:

```text
/
/shop
/new-arrivals
/category-women
/product-heritage-leather-handbag-p3
/cart
/checkout
/account
/wishlist
/blog
/contact
```

The rewrite rules are designed to work when FashionHub is installed at the domain root or inside a subfolder such as `/fashionhub/`.

The homepage root is served internally through `index.php` so it can initialize the database-aware renderer. Customers still see only `/`, not `.php` or `.html`.

## Main backend/runtime structure

```text
includes/
  bootstrap.php
  config.example.php
  db.php
  api.php

api/v1/
  health/index.php
  catalog/status/index.php
  storefront/index.php
  products/index.php
  categories/index.php

database/
  schema.sql
  seed-catalog.php
  verify-catalog.php

assets/js/
  home-storefront-bridge.js
  storefront-bootstrap.js
```

## Main documentation

- [`CHANGELOG.md`](CHANGELOG.md) — version-by-version changes.
- [`docs/DEVELOPMENT-ROADMAP.md`](docs/DEVELOPMENT-ROADMAP.md) — implementation phases.
- [`docs/BACKEND-SETUP.md`](docs/BACKEND-SETUP.md) — XAMPP/live backend setup.
- [`docs/CATALOG-SEED.md`](docs/CATALOG-SEED.md) — current catalog import and verification.
- [`docs/STOREFRONT-API.md`](docs/STOREFRONT-API.md) — database-first frontend boot flow.
- [`docs/API-INTEGRATION.md`](docs/API-INTEGRATION.md) — earlier frontend API integration notes.
- [`docs/QA-REPORT.md`](docs/QA-REPORT.md) — frontend QA notes.

## Development rules

- No framework unless the project direction is explicitly changed.
- No required third-party frontend dependency.
- Database access uses PDO prepared statements.
- Secrets belong in `includes/config.php` or environment variables and are never committed.
- Every development phase updates `VERSION` and `CHANGELOG.md`.
- Existing storefront behavior remains usable while backend features are migrated step by step.
