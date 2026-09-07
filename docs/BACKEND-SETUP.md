# Backend Setup

FashionHub backend development uses Core PHP + PDO + MySQL/MariaDB. There is no framework, Composer package or external runtime dependency.

Current backend version: `0.3.0-dev`.

## Requirements

- PHP 8.1+
- PDO MySQL extension
- MySQL 8.0+ or MariaDB 10.5+
- Apache with `mod_rewrite` for the existing clean storefront URLs

## XAMPP setup

The expected project location is:

```text
C:\xampp\htdocs\fashionhub
```

1. Start Apache and MySQL in XAMPP.
2. Create a database named `fashionhub` in phpMyAdmin.
3. For a fresh installation, select that database and import `database/schema.sql`.
4. Copy `includes/config.example.php` to `includes/config.php` if your credentials differ from the defaults.
5. Seed the current storefront catalog.
6. Run the catalog verifier.
7. Test the storefront API.
8. Open the normal clean storefront URL.

Default XAMPP database values:

```php
'host' => '127.0.0.1',
'port' => 3306,
'name' => 'fashionhub',
'user' => 'root',
'pass' => '',
```

`includes/config.php` is ignored by Git and must never be committed with production credentials.

## Seed the current catalog

From the FashionHub project root:

```bash
php database/seed-catalog.php
php database/verify-catalog.php
```

If PHP is not in the Windows PATH:

```text
C:\xampp\php\php.exe database\seed-catalog.php
C:\xampp\php\php.exe database\verify-catalog.php
```

The seed reads `data/home.json` and preserves the existing product IDs.

If you already imported the older `0.1.x` schema, you do not need to recreate the database. The seed command automatically adds the catalog fields/tables introduced in `0.2.x` before importing the data.

Full details: `docs/CATALOG-SEED.md`.

## Live hosting setup

Create/import the database using the hosting control panel, then either:

- create `includes/config.php` with the live database credentials, or
- provide the environment variables below.

Supported environment variables:

```text
FASHIONHUB_ENV
FASHIONHUB_DEBUG
FASHIONHUB_TIMEZONE
FASHIONHUB_DB_HOST
FASHIONHUB_DB_PORT
FASHIONHUB_DB_NAME
FASHIONHUB_DB_USER
FASHIONHUB_DB_PASS
```

For production use:

```text
FASHIONHUB_ENV=production
FASHIONHUB_DEBUG=0
```

Never expose database errors to customers in production.

The clean public root remains the same on live hosting. `index.php` is only the internal DirectoryIndex wrapper for the homepage; customers do not need to use `.php` URLs.

## API endpoints — v1

After importing/seeding the catalog:

```text
GET /fashionhub/api/v1/health/
GET /fashionhub/api/v1/catalog/status/
GET /fashionhub/api/v1/storefront/
GET /fashionhub/api/v1/products/
GET /fashionhub/api/v1/categories/
```

On a domain-root deployment:

```text
GET /api/v1/health/
GET /api/v1/catalog/status/
GET /api/v1/storefront/
GET /api/v1/products/
GET /api/v1/categories/
```

### Storefront payload

```text
/api/v1/storefront/
```

This is the primary `0.3.x-dev` frontend payload. Product/category catalog values come from MySQL. Static merchandising content remains in `data/home.json` during this migration phase.

After a normal page load, check the browser console:

```js
document.documentElement.dataset.catalogSource
```

Expected after a successful database connection:

```text
mysql
```

If the database/API cannot respond, the storefront intentionally uses the bundled fallback and reports:

```text
fallback
```

See `docs/STOREFRONT-API.md`.

### Products filters

```text
/api/v1/products/?id=3
/api/v1/products/?slug=heritage-leather-handbag
/api/v1/products/?category=women
/api/v1/products/?type=physical
/api/v1/products/?featured=1
/api/v1/products/?search=dress
/api/v1/products/?page=1&limit=24
```

The product response includes department and product feature data imported from the current storefront source.

The query parameters above are API parameters only. Public customer-facing product/category URLs remain clean and extensionless.

### Categories

```text
/api/v1/categories/
/api/v1/categories/?slug=women
/api/v1/categories/?tree=1
```

### Catalog status

```text
/api/v1/catalog/status/
```

This read-only endpoint reports current published product count, active category count, image count and the latest seed/import record.

## Health check

A healthy installation returns JSON similar to:

```json
{
  "ok": true,
  "service": "fashionhub-api",
  "version": "0.3.0-dev",
  "database": {
    "connected": true,
    "catalog_schema": true
  }
}
```

If `connected` fails, verify the database credentials. If `catalog_schema` is false, import `database/schema.sql`.

## Local Phase 3 verification

Open these in order:

```text
http://localhost/fashionhub/api/v1/health/
http://localhost/fashionhub/api/v1/catalog/status/
http://localhost/fashionhub/api/v1/storefront/
http://localhost/fashionhub/
http://localhost/fashionhub/shop
http://localhost/fashionhub/category-women
http://localhost/fashionhub/product-heritage-leather-handbag-p3
```

The storefront pages should use the same design as before while their product/category values come from MySQL.

## Current development rule

MySQL is now the storefront catalog authority. Keep `data/home.json` because it still supplies static merchandising content and is also the repeatable catalog seed source. Keep `data/home-data.js` as the controlled frontend fallback until production hardening removes or replaces that fallback strategy.

Cart quantities are still client-side in `0.3.x-dev`. Server-side cart/session ownership and stock validation are Phase 4 (`0.4.x-dev`).
