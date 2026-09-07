# FashionHub

FashionHub is a responsive ecommerce storefront for physical and digital products built with plain HTML, modern CSS, Vanilla JavaScript, Core PHP and MySQL/MariaDB. No frontend framework, CMS or external font dependency is required.

Current development version: **0.2.0-dev**

Version history is maintained in [`CHANGELOG.md`](CHANGELOG.md). The development sequence is documented in [`docs/DEVELOPMENT-ROADMAP.md`](docs/DEVELOPMENT-ROADMAP.md).

## Current status

The storefront UI remains usable with its bundled data while the backend is being introduced in controlled phases.

Completed backend work:

- Core PHP bootstrap and PDO MySQL connection.
- Versioned JSON catalog API.
- Product/category/attribute/variation database schema.
- Deterministic catalog import from `data/home.json`.
- Preserved numeric product IDs.
- Catalog verification tooling.
- Catalog import history with source SHA-256.
- Product API support for department, price, sale price, features, stock, images and SEO data.

The next phase (`0.3.x-dev`) connects the existing storefront rendering to the MySQL-backed API.

## Current storefront

- Responsive homepage and secondary pages.
- Physical and digital products.
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
```

On Windows/XAMPP, if `php` is not in PATH:

```text
C:\xampp\php\php.exe database\seed-catalog.php
```

The importer reads the current `data/home.json`, preserves product IDs, creates/updates categories and products, adds the current images and records an import-history row.

Then verify:

```bash
php database/verify-catalog.php
```

Detailed import documentation: [`docs/CATALOG-SEED.md`](docs/CATALOG-SEED.md).

## API v1

Available catalog endpoints:

```text
GET /api/v1/health/
GET /api/v1/catalog/status/
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

## Main backend structure

```text
includes/
  bootstrap.php
  config.example.php
  db.php
  api.php

api/v1/
  health/index.php
  catalog/status/index.php
  products/index.php
  categories/index.php

database/
  schema.sql
  seed-catalog.php
  verify-catalog.php
```

## Main documentation

- [`CHANGELOG.md`](CHANGELOG.md) — version-by-version changes.
- [`docs/DEVELOPMENT-ROADMAP.md`](docs/DEVELOPMENT-ROADMAP.md) — implementation phases.
- [`docs/BACKEND-SETUP.md`](docs/BACKEND-SETUP.md) — XAMPP/live backend setup.
- [`docs/CATALOG-SEED.md`](docs/CATALOG-SEED.md) — current catalog import and verification.
- [`docs/API-INTEGRATION.md`](docs/API-INTEGRATION.md) — frontend API integration notes.
- [`docs/QA-REPORT.md`](docs/QA-REPORT.md) — frontend QA notes.

## Development rules

- No framework unless the project direction is explicitly changed.
- No required third-party frontend dependency.
- Database access uses PDO prepared statements.
- Secrets belong in `includes/config.php` or environment variables and are never committed.
- Every development phase updates `VERSION` and `CHANGELOG.md`.
- Existing storefront behavior remains usable while backend features are migrated step by step.
