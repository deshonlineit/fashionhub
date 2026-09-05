# Secondary page architecture

All secondary storefront pages reuse the same homepage design system and are implemented without a framework, CMS, external JavaScript library, or external font.

## Page routes

- `/shop.html` — all products
- `/archive.html?type=deals` — offers/deals archive
- `/category.html?cat=women` — category archive
- `/search.html?q=watch` — search results
- `/product.html?id=3` — physical product
- `/product.html?id=31` — digital product
- `/blog.html` — blog archive
- `/post.html` — single blog post
- `/cart.html` — cart
- `/checkout.html` — checkout
- `/wishlist.html` — wishlist
- `/account.html` — customer dashboard
- `/contact.html` — support/contact

## Backend integration

`data/home-data.js` is demo data only. Replace the data source with PHP/Laravel JSON endpoints while preserving the object fields consumed by `assets/js/pages.js`. Cart and wishlist demo state use localStorage keys `fashionhub-demo-cart-v2` and `fashionhub-demo-wishlist-v2`; production should use authenticated backend state as appropriate.

Product detail changes its purchase information for `type: digital`, including license options and instant download wording. Physical products use delivery/return wording.
