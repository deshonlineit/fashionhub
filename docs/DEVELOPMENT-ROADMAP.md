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

Status: complete.

- Core PHP bootstrap.
- PDO MySQL connection.
- Versioned JSON API.
- Catalog schema for categories, products, images, attributes and variations.
- Health, products and categories endpoints.
- Local XAMPP + live-host configuration instructions.

## Phase 2 — Import current catalog (`0.2.x-dev`)

Status: complete.

- Import the current `data/home.json` catalog directly into MySQL.
- Preserve current product IDs so existing links/cart data do not break.
- Populate categories, department, physical/digital type, regular/sale price, stock defaults, SEO metadata, ratings, badges, feature lists and images.
- Keep the importer repeatable for development.
- Record import history with source SHA-256.
- Add a catalog verification script.
- Add a read-only catalog status endpoint.

See `docs/CATALOG-SEED.md`.

## Phase 3 — Connect storefront to API (`0.3.x-dev`)

Status: complete.

- Added `/api/v1/storefront/` compatibility payload built from the current MySQL catalog.
- Homepage product/category rendering is database-first.
- Shop/category/search/deals pages use the database catalog.
- Product, cart, wishlist, checkout and account runtimes receive the same database-backed product source.
- Existing clean product/category/search routes remain unchanged.
- Existing cart IDs, animations, quick view behavior and design are preserved.
- Bundled data remains available only as a controlled runtime fallback.
- Static merchandising content such as hero copy, reviews and blog fixtures remains in `data/home.json` until dedicated CMS/admin storage is introduced.

See `docs/STOREFRONT-API.md`.

## Phase 4 — Server-side cart (`0.4.x-dev`)

Status: next.

- PHP session cart.
- Guest cart.
- Logged-in cart.
- Cart merge after login.
- Stock validation on every mutation.
- Existing fly-to-cart and mini-cart UI retained.
- Keep localStorage only as a short-lived client cache/migration bridge, not as order authority.

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
