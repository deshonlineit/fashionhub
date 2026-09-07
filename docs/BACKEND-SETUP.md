# Backend Setup

FashionHub backend development uses Core PHP + PDO + MySQL/MariaDB. There is no framework, Composer package or external runtime dependency.

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
3. Select that database and import `database/schema.sql`.
4. Copy `includes/config.example.php` to `includes/config.php`.
5. The default local values already match a normal XAMPP MySQL installation:

```php
'host' => '127.0.0.1',
'port' => 3306,
'name' => 'fashionhub',
'user' => 'root',
'pass' => '',
```

`includes/config.php` is ignored by Git and must never be committed with production credentials.

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

## API endpoints — v1

After importing the schema:

```text
GET /fashionhub/api/v1/health/
GET /fashionhub/api/v1/products/
GET /fashionhub/api/v1/categories/
```

On a domain root deployment:

```text
GET /api/v1/health/
GET /api/v1/products/
GET /api/v1/categories/
```

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

The query parameters above are API parameters only. Public customer-facing product/category URLs remain clean and extensionless.

### Categories

```text
/api/v1/categories/
/api/v1/categories/?slug=women
/api/v1/categories/?tree=1
```

## Health check

A healthy installation returns JSON similar to:

```json
{
  "ok": true,
  "service": "fashionhub-api",
  "version": "0.1.0-dev",
  "database": {
    "connected": true,
    "catalog_schema": true
  }
}
```

If `connected` fails, verify the database credentials. If `catalog_schema` is false, import `database/schema.sql`.

## Current development rule

The existing storefront still reads its bundled demo data. Do not remove `data/home-data.js` yet. The next phase imports that data to MySQL first, then the frontend will be switched to the API with a controlled fallback.
