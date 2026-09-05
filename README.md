# FashionHub Homepage V2

A responsive ecommerce homepage for physical products and digital downloads, built with plain HTML, modern CSS and Vanilla JavaScript.

## Included

- Three-slide hero with product/offer elements
- Infinite-loop circular category rail
- Product slider and grid switching
- Popular products, flash deals, new arrivals and exclusive products
- Physical and digital product sections
- Category/department sections
- Coupons, gift wrapping and payment offers
- Reviews, brands, blog, social gallery, app promotion and newsletter
- Desktop category launcher
- Desktop and mobile navigation with three menu levels
- Mobile drawer with separate **Menu** and **Categories** tabs
- Search suggestions, wishlist, cart drawer and quick-view modal
- Local WebP imagery and system fonts only
- API-first homepage data with an offline fallback

## Preview locally

The page can be opened directly by double-clicking `index.html`; the bundled JavaScript fallback supplies the homepage data.

For normal HTTP testing with XAMPP, copy the folder to:

```text
C:\xampp\htdocs\fashionhub-home-v2\
```

Start Apache and open:

```text
http://localhost/fashionhub-home-v2/
```

Or use PHP's local server from this folder:

```bash
php -S 127.0.0.1:8080
```

Then open `http://127.0.0.1:8080`.

## Backend connection

Edit `assets/js/config.js`. The frontend currently requests `data/home.json` and automatically falls back to `data/home-data.js` when the page is opened directly or the API is unavailable.

Detailed PHP and Laravel instructions are in `docs/API-INTEGRATION.md`.

## Main files

```text
index.html
assets/css/app.css
assets/js/config.js
assets/js/app.js
data/home.json
data/home-data.js
backend-examples/php/home.php
docs/API-INTEGRATION.md
```

## Scope

This package contains the homepage frontend only. Product, category, cart, checkout, account and blog links are UI placeholders ready to connect to real routes later.

## Complete Storefront Pages

The package now includes a connected multi-page storefront using the same design system and no framework/CMS/library:

- `index.html` — homepage
- `shop.html` — all-products catalog with filtering, sorting, grid/list views
- `archive.html` — offers/deals product archive
- `category.html?cat=women` — category archive (also `men`, `electronics`, `digital`, etc.)
- `search.html?q=watch` — search results
- `product.html?id=3` — physical product detail
- `product.html?id=31` — digital-download product detail with license/download UI
- `blog.html` — blog archive
- `post.html` — single article
- `cart.html` — full cart
- `checkout.html` — checkout form, delivery and payment UI
- `wishlist.html` — saved products
- `account.html` — customer dashboard and downloads
- `contact.html` — customer support form

Secondary pages share `assets/js/pages.js` and `assets/css/pages.css`. Product/cart/wishlist data remains API-friendly and cart/wishlist state uses the same localStorage keys as the homepage demo.
