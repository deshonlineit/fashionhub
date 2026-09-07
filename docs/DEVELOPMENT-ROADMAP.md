# FashionHub Development Roadmap

Versioning starts with `0.1.0-dev`. The existing storefront remains usable while backend features are introduced in small, testable phases.

## Version policy

- `VERSION` contains the current application version.
- `CHANGELOG.md` records every user-visible or architectural change.
- Development versions use `-dev` until the phase is stable.
- Patch version: fixes only.
- Minor version: new backward-compatible functionality.
- Major version: intentional breaking architecture/API changes.

## Phase 1 — Backend foundation (`0.1.x-dev`)

Status: in progress.

- Core PHP bootstrap.
- PDO MySQL connection.
- Versioned JSON API.
- Catalog schema for categories, products, images, attributes and variations.
- Health, products and categories endpoints.
- Local XAMPP + live-host configuration instructions.

## Phase 2 — Import current catalog (`0.2.x-dev`)

- Convert the current `home-data.js` products/categories into SQL seed data.
- Preserve current product IDs so existing links/cart data do not break.
- Populate galleries, product type, price, stock, SEO metadata and categories.
- Add an import/seed verification script.

## Phase 3 — Connect storefront to API (`0.3.x-dev`)

- Homepage products from `/api/v1/products`.
- Shop/category/search pages from the database.
- Product page resolved from clean product slug internally.
- Keep the bundled data as an explicit development fallback only.
- Add loading/error/empty states without changing the current design.

## Phase 4 — Server-side cart (`0.4.x-dev`)

- PHP session cart.
- Guest cart.
- Logged-in cart.
- Cart merge after login.
- Stock validation on every mutation.
- Existing fly-to-cart and mini-cart UI retained.

## Phase 5 — Customers and My Account (`0.5.x-dev`)

- Customer database tables.
- Password hashing with PHP `password_hash()` / `password_verify()`.
- Billing and shipping addresses.
- Login/register/logout/session APIs.
- Replace demo customer records in `backend-examples`.
- Account details, orders and downloads backed by MySQL.

## Phase 6 — Checkout and orders (`0.6.x-dev`)

- Server-side checkout validation.
- Shipping methods.
- Payment method selection.
- Order creation and line items.
- Order status lifecycle.
- Guest and registered checkout.
- Stock reduction/restoration rules.

## Phase 7 — Admin (`0.7.x-dev`)

- Secure admin authentication.
- Dashboard.
- Products/categories/attributes/variations.
- Orders/customers/coupons/shipping/payment settings.
- Media uploads.
- SEO fields.

## Phase 8 — Production hardening (`0.8.x-dev`)

- CSRF protection.
- Rate limits for authentication and checkout.
- Security headers.
- Audit logging.
- Database indexes/query review.
- Cache strategy.
- Error logging without exposing secrets.
- Backup/restore documentation.

## Phase 9 — SEO and release candidate (`0.9.x`)

- Canonical URLs.
- Dynamic metadata.
- Product/Breadcrumb/Organization structured data.
- XML sitemap.
- Robots rules.
- 301 redirect policy for changed slugs.
- Full checkout/account/catalog QA.

## `1.0.0`

Production-ready first release: database-backed storefront, customer accounts, cart, checkout, orders and admin management with clean URLs and no frontend framework.
