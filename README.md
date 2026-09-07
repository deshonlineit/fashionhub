# FashionHub

FashionHub is a framework-free ecommerce storefront being developed with Vanilla JavaScript, HTML/CSS, Core PHP and MySQL/MariaDB.

Current application version: **0.1.0-dev**

Version history is maintained in [`CHANGELOG.md`](CHANGELOG.md). The development sequence is documented in [`docs/DEVELOPMENT-ROADMAP.md`](docs/DEVELOPMENT-ROADMAP.md).

## Current frontend

The existing storefront includes:

- Responsive homepage and secondary pages
- Physical and digital products
- Product/category/search/archive pages
- Single product page
- Wishlist and cart drawer
- Full cart and checkout UI
- WooCommerce-style customer account UI
- Desktop and mobile navigation
- Multi-level category browser
- Infinite product/category/review/hero sliders
- Clean extensionless public URLs through Apache rewrite rules
- Local WebP images and system fonts only
- No frontend framework or external font dependency

## Backend development

The production backend is now being introduced incrementally without breaking the existing storefront.

The first backend foundation includes:

```text
includes/
  bootstrap.php
  config.example.php
  db.php
  api.php

api/v1/
  health/index.php
  products/index.php
  categories/index.php

database/
  schema.sql
```

The catalog schema supports categories, products, product images, attributes, attribute terms and product variations.

The existing bundled frontend data remains active during this first backend phase. The next phase imports the current catalog into MySQL before switching the storefront rendering to the API.

## XAMPP

Recommended local path:

```text
C:\xampp\htdocs\fashionhub
```

Start Apache + MySQL and open:

```text
http://localhost/fashionhub/
```

For the new backend:

1. Create a MySQL database named `fashionhub`.
2. Import `database/schema.sql`.
3. Copy `includes/config.example.php` to `includes/config.php`.
4. Test:

```text
http://localhost/fashionhub/api/v1/health/
```

Detailed setup: [`docs/BACKEND-SETUP.md`](docs/BACKEND-SETUP.md).

## API v1

Initial endpoints:

```text
GET /api/v1/health/
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

## Main documentation

- [`CHANGELOG.md`](CHANGELOG.md) — version-by-version changes
- [`docs/DEVELOPMENT-ROADMAP.md`](docs/DEVELOPMENT-ROADMAP.md) — implementation phases
- [`docs/BACKEND-SETUP.md`](docs/BACKEND-SETUP.md) — XAMPP/live backend setup
- [`docs/API-INTEGRATION.md`](docs/API-INTEGRATION.md) — earlier frontend API integration notes
- [`docs/QA-REPORT.md`](docs/QA-REPORT.md) — existing frontend QA notes

## Development rules

- No framework unless the project direction is explicitly changed.
- No required third-party frontend dependency.
- Database access uses PDO prepared statements.
- Secrets belong in `includes/config.php` or environment variables and are never committed.
- Every development phase updates `VERSION` and `CHANGELOG.md`.
- Existing storefront behavior should remain usable while backend features are migrated step by step.
