(() => {
  'use strict';

  const CART_KEY = 'fashionhub-demo-cart-v2';
  const addSelector = '[data-action="add-cart"][data-product-id],[data-action="add-product"][data-product-id]';
  const returnSelector = '[data-action="cart-remove"],[data-action="cart-minus"],[data-action="cart-decrease"]';
  const cartChangeSelector = '[data-action="cart-remove"],[data-action="cart-minus"],[data-action="cart-decrease"],[data-action="cart-plus"],[data-action="cart-increase"]';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pendingAdds = new Set();
  let returnSnapshot = null;

  const NativeURLSearchParams = window.URLSearchParams;
  const routeLeaf = decodeURIComponent((location.pathname.split('/').pop() || '').trim());
  const siteBase = location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1);

  function slugify(value) {
    return String(value || '')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  function routeUrl(path = '') {
    return `${siteBase}${String(path).replace(/^\/+/, '')}`;
  }

  function syntheticRouteSearch() {
    const params = new NativeURLSearchParams();
    let match;
    if ((match = routeLeaf.match(/^product-(?:.*-)?p(\d+)$/i))) params.set('id', match[1]);
    else if ((match = routeLeaf.match(/^product-p(\d+)$/i))) params.set('id', match[1]);
    else if ((match = routeLeaf.match(/^category-(.+)$/i))) params.set('cat', match[1]);
    else if ((match = routeLeaf.match(/^search-(.+)$/i))) params.set('q', match[1].replace(/-/g, ' '));
    else if ((match = routeLeaf.match(/^blog-(?:.*-)?p(\d+)$/i))) params.set('post', match[1]);
    else if ((match = routeLeaf.match(/^blog-post-(\d+)$/i))) params.set('post', match[1]);
    else if (/^new-arrivals$/i.test(routeLeaf)) params.set('sort', 'new');
    else if (/^deals$/i.test(routeLeaf)) params.set('type', 'deals');
    return params.toString();
  }

  const routeSearch = syntheticRouteSearch();
  if (!location.search && routeSearch) {
    function RouteAwareURLSearchParams(init) {
      return new NativeURLSearchParams(init === location.search ? routeSearch : init);
    }
    RouteAwareURLSearchParams.prototype = NativeURLSearchParams.prototype;
    Object.setPrototypeOf(RouteAwareURLSearchParams, NativeURLSearchParams);
    window.URLSearchParams = RouteAwareURLSearchParams;
  }

  const svg = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  function readCart() {
    try {
      const value = JSON.parse(localStorage.getItem(CART_KEY));
      return value && typeof value === 'object' ? value : {};
    } catch (_) {
      return {};
    }
  }

  function cartQty(id) {
    return Number(readCart()[String(id)] || 0);
  }

  function productUrl(id) {
    const products = window.FASHIONHUB_DATA?.products || [];
    const product = products.find(item => String(item.id) === String(id));
    const slug = slugify(product?.name || 'product') || 'product';
    return routeUrl(`product-${slug}-p${encodeURIComponent(String(id || ''))}`);
  }

  function postSlug(link, postId) {
    const scope = link?.closest('.blog-card,.blog-feature,.recent-post,.article-shell');
    const title = scope?.querySelector('h1,h2,h3,b')?.textContent || link?.textContent || `post-${postId}`;
    return slugify(title.replace(/^read\s+more\b/i, '').trim()) || `post-${postId}`;
  }

  function cleanInternalUrl(raw, link = null) {
    if (!raw || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(raw)) return null;
    let url;
    try { url = new URL(raw, location.href); } catch (_) { return null; }
    if (url.origin !== location.origin) return null;
    const file = (url.pathname.split('/').pop() || '').toLowerCase();
    const prefix = url.pathname.slice(0, url.pathname.length - (url.pathname.split('/').pop() || '').length);
    const p = url.searchParams;
    let route = null;

    if (file === 'index.html') route = '';
    else if (file === 'shop.html') route = p.get('sort') === 'new' ? 'new-arrivals' : 'shop';
    else if (file === 'category.html') route = `category-${slugify(p.get('cat') || 'women')}`;
    else if (file === 'archive.html') route = 'deals';
    else if (file === 'blog.html') route = 'blog';
    else if (file === 'post.html') {
      const postId = p.get('post') || '1';
      route = `blog-${postSlug(link, postId)}-p${postId}`;
    }
    else if (file === 'cart.html') route = 'cart';
    else if (file === 'checkout.html') route = 'checkout';
    else if (file === 'account.html') route = 'account';
    else if (file === 'wishlist.html') route = 'wishlist';
    else if (file === 'contact.html') route = 'contact';
    else if (file === 'search.html') route = `search-${slugify(p.get('q') || 'products') || 'products'}`;
    else if (file === 'product.html') {
      const id = p.get('id');
      if (id) return `${productUrl(id)}${url.hash}`;
      route = 'product';
    }
    else if (/\.html$/i.test(file)) route = file.replace(/\.html$/i, '');
    else return null;

    return `${prefix}${route}${url.hash}`;
  }

  function normalizeCleanUrls(root = document) {
    const links = [];
    if (root.matches?.('a[href]')) links.push(root);
    root.querySelectorAll?.('a[href]').forEach(link => links.push(link));
    links.forEach(link => {
      const clean = cleanInternalUrl(link.getAttribute('href'), link);
      if (clean && clean !== link.getAttribute('href')) link.setAttribute('href', clean);
    });

    const forms = [];
    if (root.matches?.('form[action]')) forms.push(root);
    root.querySelectorAll?.('form[action]').forEach(form => forms.push(form));
    forms.forEach(form => {
      const action = form.getAttribute('action');
      if (!action) return;
      let url;
      try { url = new URL(action, location.href); } catch (_) { return; }
      if (url.origin !== location.origin) return;
      if ((url.pathname.split('/').pop() || '').toLowerCase() === 'search.html') form.setAttribute('action', routeUrl('search'));
    });
  }

  function isVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
  }

  function renderAddButton(button, added) {
    if (!button?.matches(addSelector)) return;
    button.classList.add('fh-add-cart');
    button.classList.remove('is-adding');
    button.classList.toggle('is-added', added);
    button.disabled = added;
    button.setAttribute('aria-disabled', String(added));
    button.innerHTML = added
      ? `${svg('check')}<span>Added</span>`
      : `${svg('cart')}<span>Add to cart</span>`;
    button.setAttribute('aria-label', added ? 'Product added to cart' : 'Add product to cart');
  }

  function markAdding(id) {
    pendingAdds.add(String(id));
    document.querySelectorAll(addSelector).forEach(button => {
      if (String(button.dataset.productId) !== String(id)) return;
      button.classList.add('fh-add-cart', 'is-adding');
      button.classList.remove('is-added');
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.innerHTML = `${svg('cart')}<span>Adding…</span>`;
    });
  }

  function syncAddButtons(root = document) {
    const cart = readCart();
    const buttons = [];
    if (root.matches?.(addSelector)) buttons.push(root);
    root.querySelectorAll?.(addSelector).forEach(button => buttons.push(button));
    buttons.forEach(button => {
      const id = String(button.dataset.productId || '');
      if (!id || pendingAdds.has(id)) return;
      renderAddButton(button, Number(cart[id] || 0) > 0);
    });
  }

  function normalizeProductLinks(root = document) {
    const selector = 'a[data-action="quick-view"][data-product-id]';
    const links = [];
    if (root.matches?.(selector)) links.push(root);
    root.querySelectorAll?.(selector).forEach(link => links.push(link));
    links.forEach(link => {
      const id = link.dataset.productId;
      if (!id) return;
      link.href = productUrl(id);
      link.removeAttribute('data-action');
      link.dataset.productLink = 'true';
    });
  }

  function sourceImage(button) {
    const summary = button.closest('.product-summary');
    const scope = button.closest('.product-card,.digital-card,.quick-view')
      || summary?.closest('.product-layout')
      || button.closest('.product-layout')
      || document;
    return scope.querySelector('.product-card__media img,.digital-card img,.quick-view__image img,.product-main-image img,img');
  }

  function cartTarget() {
    const sticky = document.querySelector('body.fh-nav-stuck .header-actions [data-action="open-cart"]');
    if (isVisible(sticky)) return sticky.querySelector('.action-icon') || sticky;
    const candidates = [...document.querySelectorAll('[data-action="open-cart"]')]
      .filter(button => !button.closest('.cart-drawer') && isVisible(button));
    const best = candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return (br.width * br.height) - (ar.width * ar.height);
    })[0];
    return best?.querySelector('.action-icon') || best || null;
  }

  function productTarget(id) {
    const candidates = [];
    document.querySelectorAll(addSelector).forEach(button => {
      if (String(button.dataset.productId || '') !== String(id) || button.closest('.cart-drawer')) return;
      const image = sourceImage(button);
      if (image && !candidates.includes(image)) candidates.push(image);
    });
    return candidates.find(isVisible) || candidates[0] || null;
  }

  function pulse(element, className) {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), 900);
  }

  function flyImage(source, destination, { reverse = false, snapshot = null } = {}) {
    return new Promise(resolve => {
      if ((!source && !snapshot) || !destination || reduceMotion.matches) {
        pulse(destination, reverse ? 'fh-product-return-hit' : 'fh-cart-hit');
        resolve();
        return;
      }

      const start = snapshot?.rect || source.getBoundingClientRect();
      const end = destination.getBoundingClientRect();
      if (!start.width || !start.height || !end.width || !end.height) {
        resolve();
        return;
      }

      const size = Math.max(56, Math.min(92, start.width, start.height));
      const startX = start.left + start.width / 2 - size / 2;
      const startY = start.top + start.height / 2 - size / 2;
      const endX = end.left + end.width / 2 - size / 2;
      const endY = end.top + end.height / 2 - size / 2;
      const dx = endX - startX;
      const dy = endY - startY;
      const flyer = document.createElement('img');
      flyer.className = `fh-cart-fly${reverse ? ' fh-cart-fly--return' : ''}`;
      flyer.src = snapshot?.src || source.currentSrc || source.src;
      flyer.alt = '';
      flyer.setAttribute('aria-hidden', 'true');
      Object.assign(flyer.style, {
        left: `${startX}px`, top: `${startY}px`, width: `${size}px`, height: `${size}px`
      });
      document.body.appendChild(flyer);

      const duration = reverse ? 1250 : 1650;
      const arc = reverse ? -40 : -96;
      const animation = flyer.animate([
        { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
        { transform: `translate3d(${dx * .26}px,${dy * .17 + arc}px,0) scale(.94)`, opacity: 1, offset: .28 },
        { transform: `translate3d(${dx * .7}px,${dy * .64 + arc * .32}px,0) scale(${reverse ? .78 : .58})`, opacity: .96, offset: .72 },
        { transform: `translate3d(${dx}px,${dy}px,0) scale(${reverse ? .55 : .12})`, opacity: reverse ? .24 : .06 }
      ], { duration, easing: 'cubic-bezier(.16,.78,.18,1)', fill: 'forwards' });

      animation.finished.catch(() => {}).finally(() => {
        flyer.remove();
        pulse(destination, reverse ? 'fh-product-return-hit' : 'fh-cart-hit');
        resolve();
      });
    });
  }

  function syncStickyState() {
    const wrap = document.querySelector('.primary-nav-wrap');
    const stuck = !!wrap?.classList.contains('is-stuck');
    document.body.classList.toggle('fh-nav-stuck', stuck);
    document.querySelectorAll('.fh-sticky-actions').forEach(node => node.remove());
  }

  function bindStickyState() {
    const bind = () => {
      const wrap = document.querySelector('.primary-nav-wrap');
      if (!wrap || wrap.dataset.fhStickyStateBound === '1') return false;
      wrap.dataset.fhStickyStateBound = '1';
      syncStickyState();
      new MutationObserver(syncStickyState).observe(wrap, { attributes: true, attributeFilter: ['class'] });
      return true;
    };
    if (bind()) return;
    const observer = new MutationObserver(() => {
      if (bind()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 6000);
  }

  function openMiniCart() {
    const drawer = document.getElementById('cartDrawer');
    if (!drawer || drawer.classList.contains('is-open')) return;
    const sticky = document.querySelector('body.fh-nav-stuck .header-actions [data-action="open-cart"]');
    const opener = isVisible(sticky)
      ? sticky
      : [...document.querySelectorAll('[data-action="open-cart"]')].find(button => !button.closest('.cart-drawer') && isVisible(button));
    if (!opener) return;
    opener.click();
    drawer.classList.add('fh-cart-arrive');
    setTimeout(() => drawer.classList.remove('fh-cart-arrive'), 950);
  }

  function prepareReturn(button) {
    const id = String(button.dataset.productId || '');
    if (!id) return;
    const action = button.dataset.action;
    if (action !== 'cart-remove' && cartQty(id) > 1) return;
    const image = button.closest('.cart-item')?.querySelector('img');
    if (!image) return;
    const rect = image.getBoundingClientRect();
    returnSnapshot = {
      id,
      src: image.currentSrc || image.src,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    };
  }

  function handleThumbnail(button) {
    const gallery = button.closest('.product-gallery');
    const thumbImage = button.querySelector('img');
    const main = gallery?.querySelector('#productMainImg,.product-main-image img');
    if (!gallery || !thumbImage || !main) return;
    gallery.querySelectorAll('.product-thumb').forEach(thumb => thumb.classList.toggle('is-active', thumb === button));
    main.src = thumbImage.currentSrc || thumbImage.src;
    main.alt = thumbImage.alt || main.alt;
    main.style.transform = thumbImage.style.transform || 'none';
    main.classList.remove('is-changing');
    void main.offsetWidth;
    main.classList.add('is-changing');
    setTimeout(() => main.classList.remove('is-changing'), 420);
  }

  function handleCardNavigation(event) {
    const quickButton = event.target.closest('button[data-action="quick-view"][data-product-id]');
    if (quickButton) return false;

    const oldQuickLink = event.target.closest('a[data-action="quick-view"][data-product-id]');
    if (oldQuickLink) {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href = productUrl(oldQuickLink.dataset.productId);
      return true;
    }

    const card = event.target.closest('.product-card[data-product-id],.digital-card[data-product-id]');
    if (!card) return false;
    const interactive = event.target.closest('button,input,select,textarea,label,a');
    if (interactive) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = productUrl(card.dataset.productId);
    return true;
  }

  function handleSearchSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return false;
    const isSearch = form.id === 'pageSiteSearch' || form.id === 'siteSearch' || form.matches('.search-lead form') || /search(?:\.html)?$/i.test(form.getAttribute('action') || '');
    if (!isSearch) return false;
    const input = form.querySelector('input[type="search"],input[name="q"],input');
    const term = input?.value.trim();
    if (!term) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = routeUrl(`search-${slugify(term) || 'products'}`);
    return true;
  }

  function bind() {
    syncAddButtons();
    normalizeProductLinks();
    normalizeCleanUrls();
    bindStickyState();

    document.addEventListener('submit', event => {
      handleSearchSubmit(event);
    }, true);

    document.addEventListener('click', event => {
      if (handleCardNavigation(event)) return;
      const thumb = event.target.closest('[data-action="thumb"]');
      if (thumb) {
        event.preventDefault();
        handleThumbnail(thumb);
        return;
      }
      const button = event.target.closest(returnSelector);
      if (button) prepareReturn(button);
    }, true);

    document.addEventListener('click', event => {
      const addButton = event.target.closest(addSelector);
      if (addButton) {
        const id = String(addButton.dataset.productId || '');
        if (id && !pendingAdds.has(id)) {
          const image = sourceImage(addButton);
          const target = cartTarget();
          markAdding(id);
          flyImage(image, target).then(() => {
            setTimeout(() => {
              pendingAdds.delete(id);
              syncAddButtons();
              setTimeout(openMiniCart, 320);
            }, 140);
          });
        }
      }

      const cartChange = event.target.closest(cartChangeSelector);
      if (cartChange) {
        const snapshot = returnSnapshot;
        returnSnapshot = null;
        setTimeout(() => {
          syncAddButtons();
          if (snapshot && cartQty(snapshot.id) < 1) {
            const destination = productTarget(snapshot.id);
            if (destination) flyImage(null, destination, { reverse: true, snapshot });
          }
        }, 0);
      }
    });

    addEventListener('storage', event => {
      if (event.key === CART_KEY) syncAddButtons();
    });

    const observer = new MutationObserver(records => {
      let syncButtons = false;
      let syncLinks = false;
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.(addSelector) || node.querySelector?.(addSelector)) syncButtons = true;
          if (node.matches?.('a[data-action="quick-view"][data-product-id]') || node.querySelector?.('a[data-action="quick-view"][data-product-id]')) syncLinks = true;
          normalizeCleanUrls(node);
        }
      }
      if (syncButtons) syncAddButtons();
      if (syncLinks) normalizeProductLinks();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
