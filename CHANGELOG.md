# Changelog

All notable changes to FashionHub are recorded here.

The project uses Semantic Versioning from this point forward. During active backend development the version carries the `-dev` suffix. Each completed development phase updates `VERSION` and this changelog before the next phase begins.

## [Unreleased]

### Planned
- Connect the existing Vanilla JS storefront to the PHP catalog API.
- Add server-side cart/session handling.
- Replace demo customer storage with database-backed accounts.
- Add checkout/order persistence and admin product management.

## [0.2.0-dev] - 2026-09-07

### Added
- Deterministic CLI catalog importer at `database/seed-catalog.php`.
- Catalog verifier at `database/verify-catalog.php`.
- Automatic upgrade of an existing `0.1.x` catalog schema when the seed command runs.
- `department` and `features_json` product fields so the database can retain the current storefront data.
- `fh_catalog_imports` history table with source SHA-256 tracking.
- `/api/v1/catalog/status/` endpoint for product/category/image/import status.
- Catalog seed and verification documentation in `docs/CATALOG-SEED.md`.

### Changed
- Catalog schema version advanced to `0.2.0-dev`.
- Product API now returns department and source feature lists.
- Current product numeric IDs are preserved during import so existing product links/cart references remain compatible.
- Current `price` and `oldPrice` data are mapped to sale/regular prices without changing storefront pricing.

### Notes
- The frontend still uses the bundled storefront data in this phase. Switching rendering to MySQL is intentionally reserved for `0.3.x-dev` so the current storefront remains usable during migration.
- The seed command is CLI-only and is not exposed as a public write endpoint.

## [0.1.0-dev] - 2026-09-07

### Added
- Project-wide version tracking with `VERSION`.
- Core PHP/MySQL backend foundation with no framework or external dependency.
- PDO database bootstrap and JSON API helpers.
- Versioned catalog API endpoints for health, products and categories.
- Production-oriented product/catalog database schema including categories, products, images, attributes and variations.
- XAMPP/live-hosting backend setup documentation.
- Step-by-step development roadmap and release policy.

### Notes
- The current storefront remains functional with its bundled demo data while the backend is introduced incrementally.
- No frontend product rendering is switched to MySQL in this release.
