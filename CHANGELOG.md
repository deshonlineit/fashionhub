# Changelog

All notable changes to FashionHub are recorded here.

The project uses Semantic Versioning from this point forward. During active backend development the version carries the `-dev` suffix. Each completed development phase will update `VERSION` and this changelog before the next phase begins.

## [Unreleased]

### Planned
- Seed the MySQL catalog with the current storefront products/categories.
- Connect the existing Vanilla JS storefront to the new PHP catalog API.
- Add server-side cart/session handling.
- Replace demo customer storage with database-backed accounts.
- Add checkout/order persistence and admin product management.

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
- No frontend product rendering is switched to MySQL in this release; that is the next development step.
