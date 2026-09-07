# Storefront API Integration

FashionHub `0.3.0-dev` changes the storefront from bundled-product-data-first to MySQL-first while preserving the existing Vanilla JavaScript UI.

## Primary storefront endpoint

```text
GET /api/v1/storefront/
```

The endpoint returns the data shape already expected by the existing frontend. This avoids duplicating or rewriting the homepage and secondary-page rendering code during the database migration.

## What comes from MySQL

The storefront endpoint replaces catalog data with current database values:

- products
- product IDs
- product names and clean slugs
- categories and product counts
- department
- physical/digital type
- current and regular prices
- sale prices
- stock state
- badges
- ratings/review counts
- product images/gallery
- descriptions
- feature lists
- SEO title/description
- featured state

It also rebuilds current product groups used by the homepage:

- Popular Products
- Flash Deals
- New Arrivals
- Digital Products
- Exclusive Picks

## What remains in `data/home.json`

For `0.3.x-dev`, static merchandising/presentation data remains in the bundled JSON:

- store display information
- navigation definition
- hero copy and banners
- department presentation copy/images
- reviews fixture content
- blog fixture content
- social images
- promotional presentation data

The product references inside those structures are checked against current MySQL product IDs before the payload is returned.

This separation is intentional. Product/catalog authority is now MySQL. Presentation content can move to admin-managed database tables in a later phase without blocking cart/customer/order development.

## Homepage boot flow

Public URL remains clean:

```text
/
```

Apache prefers the internal `index.php` DirectoryIndex. The PHP wrapper serves the existing `index.html` template and injects `assets/js/home-storefront-bridge.js` before the existing `app.js`.

The bridge:

1. keeps the bundled data as a fallback;
2. requests `/api/v1/storefront/`;
3. exposes the returned payload to the existing homepage renderer;
4. falls back to bundled data if the API/database cannot respond.

No customer-facing `.php` URL is introduced.

## Secondary-page boot flow

Pages such as Shop, Category, Search, Product, Cart, Checkout, Wishlist and Account now load:

```text
assets/js/config.js
data/home-data.js
assets/js/storefront-bootstrap.js
```

`storefront-bootstrap.js` then:

1. fetches `/api/v1/storefront/`;
2. sets `window.FASHIONHUB_DATA`;
3. loads `cart-effects.js`;
4. loads `pages.js`;
5. loads any page-specific script (`product-page.js`, `checkout.js`, `account.js`);
6. loads `category-hover.js`.

The database data therefore exists before `pages.js` captures its product/category arrays.

## Fallback behavior

If the API fails or the database has not been seeded, the frontend falls back to the already bundled data instead of presenting a broken store.

For debugging, inspect:

```js
document.documentElement.dataset.catalogSource
```

Expected values:

```text
mysql
fallback
```

`mysql` is the expected state after the database has been seeded.

## Local verification

From the project root:

```text
C:\xampp\php\php.exe database\seed-catalog.php
C:\xampp\php\php.exe database\verify-catalog.php
```

Then open:

```text
http://localhost/fashionhub/api/v1/storefront/
```

The response should contain:

```json
{
  "ok": true,
  "data": {
    "products": [],
    "categories": [],
    "_meta": {
      "source": "mysql",
      "version": "0.3.0-dev"
    }
  }
}
```

The arrays above will contain the real seeded catalog.

Then test customer-facing routes:

```text
http://localhost/fashionhub/
http://localhost/fashionhub/shop
http://localhost/fashionhub/category-women
http://localhost/fashionhub/product-heritage-leather-handbag-p3
http://localhost/fashionhub/cart
http://localhost/fashionhub/checkout
```

In browser DevTools console:

```js
document.documentElement.dataset.catalogSource
```

should return:

```text
mysql
```

## Important development rule

`0.3.x-dev` makes MySQL the catalog authority for storefront rendering, but cart quantities are still stored client-side. Server-authoritative cart/session and stock validation are Phase 4 (`0.4.x-dev`).
