(() => {
  'use strict';

  const CART_KEY = 'fashionhub-demo-cart-v2';
  const addSelector = '[data-action="add-cart"][data-product-id],[data-action="add-product"][data-product-id]';
  const returnSelector = '[data-action="cart-remove"],[data-action="cart-minus"],[data-action="cart-decrease"]';
  const cartChangeSelector = '[data-action="cart-remove"],[data-action="cart-minus"],[data-action="cart-decrease"],[data-action="cart-plus"],[data-action="cart-increase"]';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pendingAdds = new Set();
  let returnSnapshot = null;

  const currentScript = document.currentScript;
  const scriptUrl = new URL(currentScript?.src || 'assets/js/cart-effects.js', location.href);
  const rootUrl = new URL('../../', scriptUrl);
  const rootPath = rootUrl.pathname;

  const NativeURLSearchParams = window.URLSearchParams;
  const routeLeaf = decodeURIComponent((location.pathname.split('/').pop() || '').trim());

  function syntheticRouteSearch() {
    const params = new NativeURLSearchParams();
    let match;
    if ((match = routeLeaf.match(/^product-(?:.*-)?p(\d+)$/i))) params.set('id', match[1]);
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
  const slugify = value => String(value || '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  const routeUrl = path => new URL(String(path || '').replace(/^\/+/, ''), rootUrl).pathname;

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

  function productById(id) {
    return (window.FASHIONHUB_DATA?.products || []).find(item => String(item.id) === String(id));
  }

  function productUrl(id) {
    const product = productById(id);
    return routeUrl(`product-${slugify(product?.name || 'product') || 'product'}-p${encodeURIComponent(String(id || ''))}`);
  }

  function cleanInternalUrl(raw, link = null) {
    if (!raw || /^(?:#|mailto:|tel:|javascript:|data:)/i.test(raw)) return null;

    let url;
    try { url = new URL(raw, rootUrl); } catch (_) { return null; }
    if (url.origin !== location.origin) return null;

    const file = (url.pathname.split('/').pop() || '').toLowerCase();
    const params = url.searchParams;
    let route = null;

    if (file === 'index.html') return rootPath;
    if (file === 'shop.html') route = params.get('sort') === 'new' ? 'new-arrivals' : 'shop';
    else if (file === 'category.html') route = `category-${slugify(params.get('cat') || 'women')}`;
    else if (file === 'archive.html') route = 'deals';
    else if (file === 'blog.html') route = 'blog';
    else if (file === 'cart.html') route = 'cart';
    else if (file === 'checkout.html') route = 'checkout';
    else if (file === 'account.html') route = 'account';
    else if (file === 'wishlist.html') route = 'wishlist';
    else if (file === 'contact.html') route = 'contact';
    else if (file === 'search.html') route = `search-${slugify(params.get('q') || 'products') || 'products'}`;
    else if (file === 'product.html') {
      const id = params.get('id');
      route = id ? productUrl(id).slice(rootPath.length) : 'product';
    } else if (file === 'post.html') {
      const id = params.get('post') || '1';
      const scope = link?.closest('.blog-card,.blog-feature,.recent-post,.article-shell');
      const title = scope?.querySelector('h1,h2,h3,b')?.textContent || link?.textContent || `post-${id}`;
      route = `blog-${slugify(title.replace(/^read\s+more\b/i, '').trim()) || `post-${id}`}-p${id}`;
    } else if (/\.html$/i.test(file)) {
      route = file.replace(/\.html$/i, '');
    } else {
      return null;
    }

    return `${routeUrl(route)}${url.hash || ''}`;
  }

  function normalizeProductLinks(root = document) {
    const links = [];
    if (root.matches?.('a[data-action="quick-view"][data-product-id]')) links.push(root);
    root.querySelectorAll?.('a[data-action="quick-view"][data-product-id]').forEach(link => links.push(link));
    links.forEach(link => {
      const id = link.dataset.productId;
      if (!id) return;
      link.href = productUrl(id);
      link.removeAttribute('data-action');
      link.dataset.productLink = 'true';
    });
  }

  function normalizeCleanUrls(root = document) {
    const links = [];
    if (root.matches?.('a[href]')) links.push(root);
    root.querySelectorAll?.('a[href]').forEach(link => links.push(link));
    links.forEach(link => {
      const clean = cleanInternalUrl(link.getAttribute('href'), link);
      if (clean) link.setAttribute('href', clean);
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
    button.innerHTML = added ? `${svg('check')}<span>Added</span>` : `${svg('cart')}<span>Add to cart</span>`;
  }

  function markAdding(id) {
    pendingAdds.add(String(id));
    document.querySelectorAll(addSelector).forEach(button => {
      if (String(button.dataset.productId || '') !== String(id)) return;
      button.classList.add('fh-add-cart', 'is-adding');
      button.classList.remove('is-added');
      button.disabled = true;
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

  function sourceImage(button) {
    const scope = button.closest('.product-card,.digital-card,.quick-view,.product-layout') || document;
    return scope.querySelector('.product-card__media img,.digital-card img,.quick-view__image img,.product-main-image img,img');
  }

  function cartTarget() {
    const sticky = document.querySelector('body.fh-nav-stuck .header-actions [data-action="open-cart"]');
    if (isVisible(sticky)) return sticky.querySelector('.action-icon') || sticky;
    const candidates = [...document.querySelectorAll('[data-action="open-cart"]')]
      .filter(button => !button.closest('.cart-drawer') && isVisible(button));
    return candidates[0]?.querySelector('.action-icon') || candidates[0] || null;
  }

  function productTarget(id) {
    const card = document.querySelector(`.product-card[data-product-id="${CSS.escape(String(id))}"],.digital-card[data-product-id="${CSS.escape(String(id))}"]`);
    return card?.querySelector('.product-card__media img,img') || document.querySelector('.product-main-image img') || null;
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
      if (!start.width || !start.height || !end.width || !end.height) return resolve();

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
      Object.assign(flyer.style, { left:`${startX}px`, top:`${startY}px`, width:`${size}px`, height:`${size}px` });
      document.body.appendChild(flyer);

      const duration = reverse ? 1250 : 1650;
      const arc = reverse ? -40 : -96;
      const animation = flyer.animate([
        { transform:'translate3d(0,0,0) scale(1)', opacity:1 },
        { transform:`translate3d(${dx*.26}px,${dy*.17+arc}px,0) scale(.94)`, opacity:1, offset:.28 },
        { transform:`translate3d(${dx*.7}px,${dy*.64+arc*.32}px,0) scale(${reverse ? .78 : .58})`, opacity:.96, offset:.72 },
        { transform:`translate3d(${dx}px,${dy}px,0) scale(${reverse ? .55 : .12})`, opacity:reverse ? .24 : .06 }
      ], { duration, easing:'cubic-bezier(.16,.78,.18,1)', fill:'forwards' });

      animation.finished.catch(() => {}).finally(() => {
        flyer.remove();
        pulse(destination, reverse ? 'fh-product-return-hit' : 'fh-cart-hit');
        resolve();
      });
    });
  }

  function syncStickyState() {
    const wrap = document.querySelector('.primary-nav-wrap');
    document.body.classList.toggle('fh-nav-stuck', !!wrap?.classList.contains('is-stuck'));
  }

  function bindStickyState() {
    const attach = () => {
      const wrap = document.querySelector('.primary-nav-wrap');
      if (!wrap || wrap.dataset.fhStickyStateBound === '1') return false;
      wrap.dataset.fhStickyStateBound = '1';
      syncStickyState();
      new MutationObserver(syncStickyState).observe(wrap, { attributes:true, attributeFilter:['class'] });
      return true;
    };
    if (attach()) return;
    const observer = new MutationObserver(() => { if (attach()) observer.disconnect(); });
    observer.observe(document.body, { childList:true, subtree:true });
    setTimeout(() => observer.disconnect(), 6000);
  }

  function openMiniCart() {
    const drawer = document.getElementById('cartDrawer');
    if (!drawer || drawer.classList.contains('is-open')) return;
    const opener = [...document.querySelectorAll('[data-action="open-cart"]')]
      .find(button => !button.closest('.cart-drawer') && isVisible(button));
    opener?.click();
    if (drawer.classList.contains('is-open')) {
      drawer.classList.add('fh-cart-arrive');
      setTimeout(() => drawer.classList.remove('fh-cart-arrive'), 950);
    }
  }

  function prepareReturn(button) {
    const id = String(button.dataset.productId || '');
    if (!id) return;
    if (button.dataset.action !== 'cart-remove' && cartQty(id) > 1) return;
    const image = button.closest('.cart-item')?.querySelector('img');
    if (!image) return;
    const rect = image.getBoundingClientRect();
    returnSnapshot = { id, src:image.currentSrc || image.src, rect:{ left:rect.left, top:rect.top, width:rect.width, height:rect.height } };
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

  function handleProductNavigation(event) {
    if (event.target.closest('button[data-action="quick-view"][data-product-id]')) return false;
    if (event.target.closest(addSelector)) return false;
    if (event.target.closest('[data-action="toggle-wishlist"],button,input,select,textarea,label')) return false;

    const direct = event.target.closest('a[data-product-id],a[data-product-link]');
    const card = event.target.closest('.product-card[data-product-id],.digital-card[data-product-id],.mini-product[data-product-id],.search-result[data-product-id]');
    const id = direct?.dataset.productId || card?.dataset.productId;
    if (!id) return false;

    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(productUrl(id));
    return true;
  }

  function handleInternalNavigation(event) {
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return false;
    if (link.closest('.product-card,.digital-card,.mini-product,.search-result')) return false;
    const clean = cleanInternalUrl(link.getAttribute('href'), link);
    if (!clean) return false;
    const current = `${location.pathname}${location.hash}`;
    if (clean === current) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(clean);
    return true;
  }

  function handleSearchSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return false;
    const isSearch = form.id === 'pageSiteSearch' || form.id === 'siteSearch' || form.matches('.search-lead form');
    if (!isSearch) return false;
    const input = form.querySelector('input[type="search"],input[name="q"],input');
    const term = input?.value.trim();
    if (!term) return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(routeUrl(`search-${slugify(term) || 'products'}`));
    return true;
  }

  function markLoopClone(node) {
    node.dataset.loopClone = '1';
    node.setAttribute('aria-hidden', 'true');
    node.querySelectorAll('a,button,input,select,textarea,[tabindex]').forEach(control => control.setAttribute('tabindex', '-1'));
    return node;
  }

  function setupCategoryRailLoop(rail) {
    if (!rail || rail._fashionHubMove) return;
    rail.dataset.infiniteReady = '1';

    const cycleWidth = () => Math.max(0, rail.scrollWidth / 2);
    const normalize = () => {
      const cycle = cycleWidth();
      if (!cycle) return;
      if (rail.scrollLeft >= cycle) rail.scrollLeft -= cycle;
    };
    const stepSize = () => {
      const card = rail.querySelector('.category-card');
      if (!card) return Math.max(180, rail.clientWidth * .65);
      const style = getComputedStyle(rail);
      const gap = parseFloat(style.columnGap || style.gap || 0) || 0;
      const item = card.getBoundingClientRect().width + gap;
      const visible = Math.max(1, Math.floor((rail.clientWidth + gap) / Math.max(1, item)));
      return item * Math.max(1, visible - 1);
    };
    rail._fashionHubMove = direction => {
      const cycle = cycleWidth();
      const step = stepSize();
      if (cycle) {
        if (direction < 0 && rail.scrollLeft < step * .8) rail.scrollLeft += cycle;
        if (direction > 0 && rail.scrollLeft > cycle - step * .8) rail.scrollLeft -= cycle;
      }
      rail.scrollBy({ left:direction * step, behavior:reduceMotion.matches ? 'auto' : 'smooth' });
      setTimeout(normalize, reduceMotion.matches ? 40 : 620);
    };
    rail._fashionHubRecenter = normalize;
    rail.addEventListener('scroll', () => {
      clearTimeout(rail._fhCategoryNormalizeTimer);
      rail._fhCategoryNormalizeTimer = setTimeout(normalize, 120);
    }, { passive:true });
  }

  function setupFallbackInfiniteRail(rail) {
    if (!rail || rail._fashionHubMove || rail.dataset.infiniteReady === '1' || rail.classList.contains('is-grid')) return;
    if (rail.id === 'categoryRail') {
      setupCategoryRailLoop(rail);
      return;
    }

    const originals = [...rail.children].filter(node => node.nodeType === 1 && node.dataset.loopClone !== '1');
    if (originals.length < 2) return;

    const before = document.createDocumentFragment();
    const after = document.createDocumentFragment();
    originals.forEach(node => before.appendChild(markLoopClone(node.cloneNode(true))));
    originals.forEach(node => after.appendChild(markLoopClone(node.cloneNode(true))));
    rail.prepend(before);
    rail.append(after);
    rail.dataset.infiniteReady = '1';

    let cycleWidth = 0;
    let middleStart = 0;
    let afterStart = 0;
    let scrollTimer = 0;
    let autoTimer = 0;
    let paused = false;
    let moving = false;

    const measure = () => {
      const children = [...rail.children];
      const count = originals.length;
      const middleFirst = children[count];
      const afterFirst = children[count * 2];
      if (!middleFirst || !afterFirst) return false;
      middleStart = middleFirst.offsetLeft;
      afterStart = afterFirst.offsetLeft;
      cycleWidth = afterStart - middleStart;
      return cycleWidth > 0;
    };
    const center = () => {
      if (!measure()) return;
      rail.scrollLeft = middleStart;
    };
    const normalize = () => {
      if (!cycleWidth && !measure()) return;
      const first = rail.querySelector('.product-card,.review-card,.category-card,.campaign-card,.blog-card');
      const buffer = Math.max(24, (first?.getBoundingClientRect().width || 80) * .45);
      if (rail.scrollLeft < middleStart - buffer) rail.scrollLeft += cycleWidth;
      else if (rail.scrollLeft >= afterStart - buffer) rail.scrollLeft -= cycleWidth;
    };
    const stepSize = () => {
      const first = rail.querySelector('.product-card,.review-card,.category-card,.campaign-card,.blog-card') || originals[0];
      const style = getComputedStyle(rail);
      const gap = parseFloat(style.columnGap || style.gap || 0) || 0;
      const item = (first?.getBoundingClientRect().width || Math.max(180, rail.clientWidth * .5)) + gap;
      const visible = Math.max(1, Math.floor((rail.clientWidth + gap) / Math.max(1, item)));
      return item * Math.max(1, visible - 1);
    };
    const move = direction => {
      if (rail.classList.contains('is-grid')) return;
      moving = true;
      rail.scrollBy({ left:direction * stepSize(), behavior:reduceMotion.matches ? 'auto' : 'smooth' });
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        moving = false;
        normalize();
      }, reduceMotion.matches ? 40 : 620);
    };

    rail._fashionHubMove = move;
    rail._fashionHubRecenter = () => requestAnimationFrame(center);
    rail.addEventListener('mouseenter', () => { paused = true; }, { passive:true });
    rail.addEventListener('mouseleave', () => { paused = false; }, { passive:true });
    rail.addEventListener('focusin', () => { paused = true; });
    rail.addEventListener('focusout', () => { paused = false; });
    rail.addEventListener('pointerdown', () => { paused = true; }, { passive:true });
    rail.addEventListener('pointerup', () => { paused = false; }, { passive:true });
    rail.addEventListener('pointercancel', () => { paused = false; }, { passive:true });
    rail.addEventListener('scroll', () => {
      if (moving) return;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(normalize, 110);
    }, { passive:true });

    requestAnimationFrame(() => requestAnimationFrame(center));
    if (!reduceMotion.matches) {
      autoTimer = setInterval(() => {
        if (!rail.isConnected) return clearInterval(autoTimer);
        if (!paused && !document.hidden && !rail.classList.contains('is-grid')) move(1);
      }, 5200);
    }
  }

  function setupInfiniteHero() {
    const track = document.getElementById('heroSlides');
    const dots = document.getElementById('heroDots');
    if (!track || !dots || track.dataset.fhInfiniteHero === '1') return;
    const originals = [...track.children].filter(node => node.classList?.contains('hero-slide') && node.dataset.loopClone !== '1');
    const count = originals.length;
    if (count < 2) return;

    const leading = markLoopClone(originals[count - 1].cloneNode(true));
    const trailing = markLoopClone(originals[0].cloneNode(true));
    leading.classList.add('fh-hero-clone');
    trailing.classList.add('fh-hero-clone');
    track.prepend(leading);
    track.append(trailing);
    track.dataset.fhInfiniteHero = '1';

    const activeDotIndex = () => {
      const buttons = [...dots.querySelectorAll('[data-hero-index]')];
      const active = buttons.find(button => button.getAttribute('aria-current') === 'true' || button.classList.contains('is-active'));
      const index = active ? buttons.indexOf(active) : 0;
      return Math.max(0, Math.min(count - 1, index));
    };

    let logicalIndex = activeDotIndex();
    let pendingJump = null;
    let syncQueued = false;

    const setA11y = index => {
      leading.setAttribute('aria-hidden', 'true');
      trailing.setAttribute('aria-hidden', 'true');
      originals.forEach((slide, slideIndex) => slide.setAttribute('aria-hidden', String(slideIndex !== index)));
    };

    const writePosition = (position, instant = false) => {
      track.dataset.fhHeroInternal = '1';
      const previousTransition = track.style.transition;
      if (instant) track.style.transition = 'none';
      track.style.transform = `translate3d(-${position * 100}%,0,0)`;
      if (instant) {
        void track.offsetWidth;
        track.style.transition = previousTransition;
      }
      requestAnimationFrame(() => { delete track.dataset.fhHeroInternal; });
    };

    const moveTo = target => {
      target = Math.max(0, Math.min(count - 1, Number(target) || 0));
      pendingJump = null;
      let visualPosition = target + 1;
      if (!reduceMotion.matches && logicalIndex === count - 1 && target === 0) {
        visualPosition = count + 1;
        pendingJump = 1;
      } else if (!reduceMotion.matches && logicalIndex === 0 && target === count - 1) {
        visualPosition = 0;
        pendingJump = count;
      }
      logicalIndex = target;
      setA11y(target);
      writePosition(visualPosition, reduceMotion.matches);
    };

    const scheduleSync = () => {
      if (track.dataset.fhHeroInternal === '1' || syncQueued) return;
      syncQueued = true;
      queueMicrotask(() => {
        syncQueued = false;
        if (track.dataset.fhHeroInternal === '1') return;
        moveTo(activeDotIndex());
      });
    };

    writePosition(logicalIndex + 1, true);
    setA11y(logicalIndex);

    const trackObserver = new MutationObserver(scheduleSync);
    trackObserver.observe(track, { attributes:true, attributeFilter:['style'] });
    const dotsObserver = new MutationObserver(scheduleSync);
    dotsObserver.observe(dots, { attributes:true, subtree:true, attributeFilter:['class','aria-current'] });

    track.addEventListener('transitionend', event => {
      if (event.target !== track || event.propertyName !== 'transform' || pendingJump == null) return;
      const jump = pendingJump;
      pendingJump = null;
      writePosition(jump, true);
    });
  }

  function setupInfiniteSliders() {
    const run = () => {
      setupInfiniteHero();
      document.querySelectorAll('.rail').forEach(setupFallbackInfiniteRail);
    };

    const isHomepage = !!document.getElementById('heroSlider');
    if (!isHomepage || document.documentElement.classList.contains('is-ready')) {
      run();
    } else {
      const readyObserver = new MutationObserver(() => {
        if (!document.documentElement.classList.contains('is-ready')) return;
        readyObserver.disconnect();
        run();
      });
      readyObserver.observe(document.documentElement, { attributes:true, attributeFilter:['class'] });
    }

    const lateObserver = new MutationObserver(records => {
      let found = false;
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.('.rail,#heroSlides') || node.querySelector?.('.rail,#heroSlides')) found = true;
        }
      }
      if (found) requestAnimationFrame(run);
    });
    lateObserver.observe(document.body, { childList:true, subtree:true });
  }

  function bind() {
    normalizeProductLinks();
    normalizeCleanUrls();
    syncAddButtons();
    bindStickyState();
    setupInfiniteSliders();

    document.addEventListener('submit', event => { handleSearchSubmit(event); }, true);

    document.addEventListener('click', event => {
      if (handleProductNavigation(event)) return;
      if (handleInternalNavigation(event)) return;

      const thumb = event.target.closest('[data-action="thumb"]');
      if (thumb) {
        event.preventDefault();
        handleThumbnail(thumb);
        return;
      }

      const returnButton = event.target.closest(returnSelector);
      if (returnButton) prepareReturn(returnButton);
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
            if (destination) flyImage(null, destination, { reverse:true, snapshot });
          }
        }, 0);
      }
    });

    addEventListener('storage', event => { if (event.key === CART_KEY) syncAddButtons(); });

    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          normalizeProductLinks(node);
          normalizeCleanUrls(node);
          syncAddButtons(node);
        }
      }
    });
    observer.observe(document.body, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true });
  else bind();
})();