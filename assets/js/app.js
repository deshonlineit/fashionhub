(() => {
  'use strict';

  const CONFIG = Object.freeze({
    apiBase: window.FASHIONHUB_API_BASE || 'data',
    homeEndpoint: window.FASHIONHUB_HOME_ENDPOINT || 'home.json',
    cartKey: 'fashionhub-demo-cart-v2',
    wishlistKey: 'fashionhub-demo-wishlist-v2',
    dealKey: 'fashionhub-demo-deal-end-v2'
  });

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
  const icon = name => `<svg aria-hidden="true"><use href="#i-${esc(name)}"></use></svg>`;
  const clamp = (number, min, max) => Math.min(Math.max(number, min), max);

  const API = {
    async home() {
      const fallback = window.__FASHIONHUB_HOME__;
      // The bundled data is already loaded before app.js. Use it immediately so
      // first paint never waits for a second home.json request. Remove
      // data/home-data.js later when switching this storefront to a live API.
      if (fallback) return fallback;
      try {
        const base = String(CONFIG.apiBase || '').replace(/\/$/, '');
        const endpoint = String(CONFIG.homeEndpoint || '').trim();
        const url = /^(?:https?:)?\/\//.test(endpoint) || endpoint.startsWith('/')
          ? endpoint
          : `${base}/${endpoint.replace(/^\//, '')}`;
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
          cache: 'default'
        });
        if (!response.ok) throw new Error(`Home API returned ${response.status}`);
        return await response.json();
      } catch (error) {
        console.warn('[FashionHub] API fallback used:', error.message);
        if (fallback) return fallback;
        throw error;
      }
    }
  };

  const state = {
    data: null,
    products: new Map(),
    heroIndex: 0,
    heroTimer: null,
    cart: readStorage(CONFIG.cartKey, {}),
    wishlist: new Set(readStorage(CONFIG.wishlistKey, [])),
    activeDepartment: 'Fashion'
  };

  function readStorage(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* storage can be blocked */ }
  }

  function money(value) {
    return `${state.data?.store?.currencySymbol || '৳'}${new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
  }

  function productById(id) {
    return state.products.get(Number(id));
  }

  function productList(ids = []) {
    return ids.map(productById).filter(Boolean);
  }

  function stars(rating) {
    const rounded = Math.round(Number(rating || 0));
    return `${'★'.repeat(rounded)}${'☆'.repeat(Math.max(0, 5 - rounded))}`;
  }

  function badgeClass(product) {
    if (product.type === 'digital') return 'product-badge--digital';
    if (String(product.badge).toLowerCase() === 'new' || String(product.badge).toLowerCase() === 'best') return 'product-badge--new';
    return '';
  }

  function productCard(product, { compact = false } = {}) {
    const wished = state.wishlist.has(product.id);
    return `
      <article class="product-card${compact ? ' product-card--compact' : ''}" data-product-id="${product.id}">
        <div class="product-card__media">
          <span class="product-badge ${badgeClass(product)}">${esc(product.badge)}</span>
          <button class="product-card__wish${wished ? ' is-active' : ''}" type="button" data-action="toggle-wishlist" data-product-id="${product.id}" aria-label="${wished ? 'Remove from' : 'Add to'} wishlist" aria-pressed="${wished}">${icon('heart')}</button>
          <img src="${esc(product.image)}" width="720" height="720" loading="lazy" decoding="async" alt="${esc(product.name)}">
          <button class="product-card__quick" type="button" data-action="quick-view" data-product-id="${product.id}">${icon('eye')} Quick view</button>
        </div>
        <div class="product-card__body">
          <span class="product-card__category">${esc(product.type === 'digital' ? `Digital • ${product.category}` : product.category)}</span>
          <h3><a href="#" data-action="quick-view" data-product-id="${product.id}">${esc(product.name)}</a></h3>
          <div class="product-card__rating"><span>${stars(product.rating)}</span><small>(${esc(product.reviews)})</small></div>
          <div class="product-card__footer">
            <div class="product-price"><strong>${money(product.price)}</strong>${product.oldPrice ? `<del>${money(product.oldPrice)}</del>` : ''}</div>
            <button class="add-button" type="button" data-action="add-cart" data-product-id="${product.id}" aria-label="Add ${esc(product.name)} to cart">${icon('plus')}</button>
          </div>
        </div>
      </article>`;
  }

  function recursiveDesktopMenu(items, depth = 0) {
    return `<ul>${items.map(item => {
      const hasChildren = Array.isArray(item.children) && item.children.length;
      return `<li${item.active ? ' class="is-active"' : ''}>
        <a href="${esc(item.url || '#')}">${esc(item.label)}${hasChildren ? icon('chevron-down') : ''}</a>
        ${hasChildren ? recursiveDesktopMenu(item.children, depth + 1) : ''}
      </li>`;
    }).join('')}</ul>`;
  }

  function desktopCategoryMenu(items) {
    return `<ul>${items.map(item => `
      <li>
        <a href="#"><span class="menu-icon">${icon(item.icon || 'grid')}</span><span>${esc(item.label)}</span>${icon('chevron-right')}</a>
        ${item.children?.length ? `<ul>${item.children.map(child => `
          <li><a href="#">${esc(child.label)}</a>${child.children?.length ? `<ul>${child.children.map(grand => `<li><a href="#">${esc(grand.label)}</a></li>`).join('')}</ul>` : ''}</li>
        `).join('')}</ul>` : ''}
      </li>`).join('')}</ul>`;
  }

  function mobileTree(items, { categories = false, depth = 0 } = {}) {
    return `<ul class="mobile-tree${categories && depth === 0 ? ' mobile-tree--categories' : ''}">${items.map((item, index) => {
      const children = item.children || [];
      const hasChildren = children.length > 0;
      const categoryInfo = categories && depth === 0 ? state.data.categories[index % state.data.categories.length] : null;
      return `<li>
        <div class="mobile-tree__row">
          <a href="${esc(item.url || '#')}">${categoryInfo ? `<img class="mobile-tree__thumb" src="${esc(categoryInfo.image)}" width="80" height="80" loading="lazy" alt="">` : ''}<span>${esc(item.label)}</span></a>
          ${hasChildren ? `<button type="button" data-action="toggle-tree" aria-label="Open ${esc(item.label)} submenu" aria-expanded="false">${icon('chevron-down')}</button>` : ''}
        </div>
        ${hasChildren ? mobileTree(children, { categories, depth: depth + 1 }) : ''}
      </li>`;
    }).join('')}</ul>`;
  }

  function heroMarkup(hero, index) {
    const floating = (hero.float || []).map((item, cardIndex) => {
      const product = productById(item.productId);
      if (!product) return '';
      return `<div class="hero-float-card hero-float-card--${cardIndex ? 'two' : 'one'}"><img src="${esc(product.image)}" width="90" height="90" alt=""><div><b>${esc(item.label)}</b><small>${money(product.price)}</small></div></div>`;
    }).join('');
    return `<article class="hero-slide" data-kind="${esc(hero.kind)}" style="--hero-bg:${esc(hero.bg)}" aria-hidden="${index !== 0}">
      <div class="hero-slide__copy">
        <span class="eyebrow">${esc(hero.eyebrow)}</span>
        <h1>${esc(hero.title)}</h1>
        <p>${esc(hero.description)}</p>
        <div class="hero-actions"><a class="primary-button" href="#allProducts">${esc(hero.primary)} ${icon('arrow-right')}</a><a class="secondary-button" href="#newArrivals">${esc(hero.secondary)}</a></div>
        <div class="hero-proof"><span class="hero-proof__avatars"><span>SA</span><span>RK</span><span>NA</span></span><span>Trusted by 12,000+ happy customers</span></div>
      </div>
      <div class="hero-slide__media"><img class="hero-main-image" src="${esc(hero.image)}" width="1200" height="710" ${index ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" alt=""></div>
      <div class="hero-discount">UP TO<strong>${esc(hero.discount)}</strong>OFF</div>
      ${floating}
    </article>`;
  }

  function renderHero() {
    const heroes = state.data.heroes || [];
    byId('heroSlides').innerHTML = heroes.map(heroMarkup).join('');
    byId('heroDots').innerHTML = heroes.map((_, index) => `<button type="button" data-hero-index="${index}" class="${index === 0 ? 'is-active' : ''}" aria-label="Show slide ${index + 1}" aria-current="${index === 0 ? 'true' : 'false'}"></button>`).join('');
    updateHero(0, false);
    startHeroAuto();
  }

  function updateHero(index, animate = true) {
    const total = state.data.heroes.length;
    state.heroIndex = (index + total) % total;
    const slides = byId('heroSlides');
    if (!animate) slides.style.transition = 'none';
    slides.style.transform = `translate3d(-${state.heroIndex * 100}%,0,0)`;
    if (!animate) requestAnimationFrame(() => { slides.style.transition = ''; });
    $$('.hero-slide', slides).forEach((slide, i) => slide.setAttribute('aria-hidden', String(i !== state.heroIndex)));
    $$('[data-hero-index]', byId('heroDots')).forEach((dot, i) => {
      dot.classList.toggle('is-active', i === state.heroIndex);
      dot.setAttribute('aria-current', String(i === state.heroIndex));
    });
  }

  function startHeroAuto() {
    clearInterval(state.heroTimer);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    state.heroTimer = setInterval(() => updateHero(state.heroIndex + 1), 5800);
  }

  function renderCategories() {
    const categories = state.data.categories;
    const markup = categories.map(category => `<a class="category-card" href="#allProducts"><span class="category-card__image"><img src="${esc(category.image)}" width="480" height="480" loading="lazy" decoding="async" alt="${esc(category.name)}"></span><b>${esc(category.name)}</b><small>${esc(category.count)} items</small></a>`).join('');
    byId('categoryRail').innerHTML = `${markup}<div aria-hidden="true" style="display:contents">${markup}</div>`;
    initCategoryLoop();
  }

  function renderProductGroups() {
    const groups = state.data.productGroups;
    byId('popularRail').innerHTML = productList(groups.popular).map(product => productCard(product)).join('');
    byId('flashRail').innerHTML = productList(groups.flash).map(product => productCard(product, { compact: true })).join('');
    byId('newRail').innerHTML = productList(groups.new).map(product => productCard(product, { compact: true })).join('');
    byId('digitalGrid').innerHTML = productList(groups.digital).map(product => `
      <article class="digital-card" data-product-id="${product.id}">
        <img src="${esc(product.image)}" width="720" height="720" loading="lazy" decoding="async" alt="${esc(product.name)}">
        <div class="digital-card__meta"><span>${esc(product.category)}</span><h3>${esc(product.name)}</h3><p>${esc(product.features[0])} • ${esc(product.features[1])}</p><div class="digital-card__bottom"><b>${money(product.price)}</b><button type="button" data-action="add-cart" data-product-id="${product.id}">Add to cart</button></div></div>
      </article>`).join('');
    byId('exclusiveGrid').innerHTML = productList(groups.exclusive).map(product => productCard(product, { compact: true })).join('');
  }

  function renderDepartments() {
    const departments = state.data.departments;
    byId('departmentTabs').innerHTML = departments.map((department, index) => `<button type="button" role="tab" data-department="${esc(department.id)}" class="${index === 0 ? ' is-active' : ''}" aria-selected="${index === 0}">${esc(department.id)}</button>`).join('');
    renderDepartment(departments[0].id);
  }

  function renderDepartment(id) {
    const department = state.data.departments.find(item => item.id === id) || state.data.departments[0];
    state.activeDepartment = department.id;
    $$('[data-department]').forEach(button => {
      const active = button.dataset.department === department.id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    byId('departmentShowcase').innerHTML = `
      <article class="department-feature" style="--feature-bg:${esc(department.bg)}">
        <span class="eyebrow">${esc(department.eyebrow)}</span><h3>${esc(department.title)}</h3><p>${esc(department.description)}</p><a class="primary-button" href="#">Explore department ${icon('arrow-right')}</a>
        <img src="${esc(department.image)}" width="1200" height="710" loading="lazy" decoding="async" alt="">
      </article>
      <div class="department-grid">${productList(department.products).slice(0, 8).map(product => productCard(product, { compact: true })).join('')}</div>`;
  }

  function renderBestsellers() {
    byId('bestsellerColumns').innerHTML = state.data.bestsellers.map(group => `
      <section class="bestseller-column"><div class="bestseller-column__head"><h3>${esc(group.title)}</h3><a href="#">View all</a></div>${productList(group.products).map(product => `
        <a class="mini-product" href="#" data-action="quick-view" data-product-id="${product.id}"><img src="${esc(product.image)}" width="130" height="130" loading="lazy" decoding="async" alt=""><span class="mini-product__copy"><b>${esc(product.name)}</b><span>${money(product.price)}</span><small>${stars(product.rating)}</small></span></a>`).join('')}</section>`).join('');
  }

  function renderReviews() {
    byId('reviewRail').innerHTML = state.data.reviews.map(review => `
      <article class="review-card"><div class="review-card__top"><span class="review-avatar">${esc(review.initials)}</span><div class="review-card__name"><b>${esc(review.name)}</b><small>Verified Buyer</small></div><span class="review-stars">${stars(review.rating)}</span></div><p>“${esc(review.text)}”</p><small>${esc(review.meta)}</small></article>`).join('');
  }

  function renderBlogAndSocial() {
    byId('blogGrid').innerHTML = state.data.blogs.map(blog => `
      <article class="blog-card"><a class="blog-card__image" href="#"><img src="${esc(blog.image)}" width="900" height="520" loading="lazy" decoding="async" alt=""><span class="blog-card__tag">${esc(blog.tag)}</span></a><div class="blog-card__body"><time>${esc(blog.date)}</time><h3><a href="#">${esc(blog.title)}</a></h3><p>${esc(blog.excerpt)}</p><a class="text-link" href="#">Read article ${icon('arrow-right')}</a></div></article>`).join('');
    byId('socialGrid').innerHTML = state.data.social.map((image, index) => `<a class="social-card" href="#" aria-label="View social post ${index + 1}"><img src="${esc(image)}" width="560" height="560" loading="lazy" decoding="async" alt="FashionHub social post ${index + 1}"></a>`).join('');
  }

  function renderNavigation() {
    byId('desktopNav').innerHTML = recursiveDesktopMenu(state.data.navigation);
    byId('desktopCategoryMenu').innerHTML = desktopCategoryMenu(state.data.categoryTree);
    byId('mobileMenuPanel').innerHTML = mobileTree(state.data.navigation);
    byId('mobileCategoryPanel').innerHTML = mobileTree(state.data.categoryTree, { categories: true });
  }

  function initCategoryLoop() {
    const rail = byId('categoryRail');
    if (!rail || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let paused = false;
    let last = performance.now();
    const tick = time => {
      if (!paused && time - last > 25) {
        rail.scrollLeft += 0.7;
        last = time;
        if (rail.scrollLeft >= rail.scrollWidth / 2) rail.scrollLeft -= rail.scrollWidth / 2;
      }
      requestAnimationFrame(tick);
    };
    ['pointerenter','touchstart','focusin'].forEach(event => rail.addEventListener(event, () => { paused = true; }, { passive: true }));
    ['pointerleave','touchend','focusout'].forEach(event => rail.addEventListener(event, () => { paused = false; }, { passive: true }));
    requestAnimationFrame(tick);
  }

  function updateCountdown(elementId, target) {
    const element = byId(elementId);
    if (!element) return;
    const remaining = Math.max(0, target - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600) + days * 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    element.innerHTML = [['Hours', hours], ['Mins', minutes], ['Secs', seconds]].map(([label, value]) => `<span class="countdown-unit"><b>${String(value).padStart(2, '0')}</b><small>${label}</small></span>`).join('');
  }

  function initCountdowns() {
    let target = Number(readStorage(CONFIG.dealKey, 0));
    if (!target || target < Date.now()) {
      target = Date.now() + (31 * 60 * 60 + 45 * 60 + 30) * 1000;
      writeStorage(CONFIG.dealKey, target);
    }
    const render = () => {
      updateCountdown('mainCountdown', target);
      updateCountdown('flashCountdown', target);
    };
    render();
    setInterval(render, 1000);
  }

  function scrollRail(id, direction) {
    const rail = byId(id);
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(240, rail.clientWidth * .78), behavior: 'smooth' });
  }

  function setProductView(id, view) {
    const rail = byId(id);
    if (!rail) return;
    const isGrid = view === 'grid';
    rail.classList.toggle('is-grid', isGrid);
    $$(`[data-view-target="${CSS.escape(id)}"]`).forEach(button => button.classList.toggle('is-active', button.dataset.view === view));
    const shell = rail.closest('.product-rail-shell');
    if (shell) $$('[data-rail-prev],[data-rail-next]', shell).forEach(button => button.hidden = isGrid);
  }

  function toggleWishlist(id) {
    const product = productById(id);
    if (!product) return;
    if (state.wishlist.has(product.id)) {
      state.wishlist.delete(product.id);
      toast(`${product.name} removed from wishlist.`);
    } else {
      state.wishlist.add(product.id);
      toast(`${product.name} added to wishlist.`);
    }
    writeStorage(CONFIG.wishlistKey, Array.from(state.wishlist));
    updateWishlistUI(product.id);
  }

  function updateWishlistUI(productId = null) {
    byId('wishlistCount').textContent = String(state.wishlist.size);
    const selector = productId ? `[data-action="toggle-wishlist"][data-product-id="${productId}"]` : '[data-action="toggle-wishlist"]';
    $$(selector).forEach(button => {
      const active = state.wishlist.has(Number(button.dataset.productId));
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.setAttribute('aria-label', active ? 'Remove from wishlist' : 'Add to wishlist');
    });
  }

  function addCart(id, quantity = 1) {
    const product = productById(id);
    if (!product) return;
    state.cart[product.id] = (Number(state.cart[product.id]) || 0) + quantity;
    writeStorage(CONFIG.cartKey, state.cart);
    updateCartUI();
    toast(`${product.name} added to cart.`);
  }

  function changeCart(id, delta) {
    const current = Number(state.cart[id]) || 0;
    const next = current + delta;
    if (next <= 0) delete state.cart[id]; else state.cart[id] = next;
    writeStorage(CONFIG.cartKey, state.cart);
    updateCartUI();
  }

  function removeCart(id) {
    delete state.cart[id];
    writeStorage(CONFIG.cartKey, state.cart);
    updateCartUI();
  }

  function cartEntries() {
    return Object.entries(state.cart).map(([id, quantity]) => ({ product: productById(id), quantity: Number(quantity) })).filter(item => item.product && item.quantity > 0);
  }

  function updateCartUI() {
    const entries = cartEntries();
    const count = entries.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = entries.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    byId('cartCount').textContent = String(count);
    byId('cartSummary').textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
    byId('cartSubtotal').textContent = money(subtotal);
    byId('cartItems').innerHTML = entries.length ? entries.map(({ product, quantity }) => `
      <article class="cart-item"><img src="${esc(product.image)}" width="156" height="156" alt="${esc(product.name)}"><div><h3>${esc(product.name)}</h3><strong>${money(product.price)}</strong><div class="cart-quantity"><button type="button" data-action="cart-decrease" data-product-id="${product.id}" aria-label="Decrease quantity">${icon('minus')}</button><span>${quantity}</span><button type="button" data-action="cart-increase" data-product-id="${product.id}" aria-label="Increase quantity">${icon('plus')}</button></div></div><button class="cart-remove" type="button" data-action="cart-remove" data-product-id="${product.id}" aria-label="Remove item">${icon('close')}</button></article>`).join('') : `<div class="cart-empty"><div>${icon('cart')}<b>Your cart is empty</b><span>Add products from any section to see them here.</span></div></div>`;
  }

  function openPanel(panel, backdrop) {
    panel.classList.add('is-open');
    backdrop.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
  }

  function closePanel(panel, backdrop) {
    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    if (!$('.mobile-drawer.is-open') && !$('.cart-drawer.is-open') && !$('.modal.is-open')) document.body.classList.remove('is-locked');
  }

  function openQuickView(id) {
    const product = productById(id);
    if (!product) return;
    byId('quickViewContent').innerHTML = `<article class="quick-view"><div class="quick-view__image"><img src="${esc(product.image)}" width="720" height="720" alt="${esc(product.name)}"></div><div class="quick-view__copy"><span class="product-badge ${badgeClass(product)}">${esc(product.badge)}</span><h2 id="quickViewTitle">${esc(product.name)}</h2><div class="product-card__rating"><span>${stars(product.rating)}</span><small>${esc(product.reviews)} reviews</small></div><p>${esc(product.description)}</p><div class="product-price"><strong>${money(product.price)}</strong><del>${money(product.oldPrice)}</del></div><ul class="quick-view__features">${product.features.map(feature => `<li>${icon('check')}${esc(feature)}</li>`).join('')}</ul><button type="button" class="primary-button primary-button--full" data-action="add-cart" data-product-id="${product.id}">${icon('cart')} Add to cart</button></div></article>`;
    const modal = byId('quickViewModal');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    $('.modal__close', modal)?.focus();
  }

  function closeModal() {
    const modal = byId('quickViewModal');
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (!$('.mobile-drawer.is-open') && !$('.cart-drawer.is-open')) document.body.classList.remove('is-locked');
  }

  function toast(message) {
    const region = byId('toastRegion');
    const node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = `${icon('check')}<span>${esc(message)}</span>`;
    region.append(node);
    setTimeout(() => node.remove(), 3300);
  }

  function performSearch(value) {
    const query = value.trim().toLowerCase();
    const box = byId('searchResults');
    if (!query) { box.hidden = true; box.innerHTML = ''; return; }
    const results = state.data.products.filter(product => `${product.name} ${product.category} ${product.department}`.toLowerCase().includes(query)).slice(0, 7);
    box.hidden = false;
    box.innerHTML = results.length ? `<div class="search-results__head"><span>Matching products</span><span>${results.length} shown</span></div>${results.map(product => `<a class="search-result" href="#" data-action="quick-view" data-product-id="${product.id}"><img src="${esc(product.image)}" width="104" height="104" alt=""><span><strong>${esc(product.name)}</strong><small>${esc(product.category)}</small></span><b>${money(product.price)}</b></a>`).join('')}` : `<div class="search-empty">No products found for “${esc(value)}”.</div>`;
  }

  function initEvents() {
    document.addEventListener('click', event => {
      const actionElement = event.target.closest('[data-action]');
      if (actionElement) {
        const action = actionElement.dataset.action;
        const id = Number(actionElement.dataset.productId);
        if (['quick-view','add-cart','toggle-wishlist','cart-increase','cart-decrease','cart-remove'].includes(action)) event.preventDefault();
        if (action === 'open-menu') openPanel(byId('mobileDrawer'), byId('drawerBackdrop'));
        if (action === 'close-menu') closePanel(byId('mobileDrawer'), byId('drawerBackdrop'));
        if (action === 'open-cart') openPanel(byId('cartDrawer'), byId('cartBackdrop'));
        if (action === 'close-cart') closePanel(byId('cartDrawer'), byId('cartBackdrop'));
        if (action === 'toggle-categories') {
          const launcher = actionElement.closest('.category-launcher');
          const open = launcher.classList.toggle('is-open');
          actionElement.setAttribute('aria-expanded', String(open));
        }
        if (action === 'toggle-tree') {
          const item = actionElement.closest('li');
          const open = item.classList.toggle('is-open');
          actionElement.setAttribute('aria-expanded', String(open));
        }
        if (action === 'focus-search') { byId('searchInput').focus(); }
        if (action === 'toggle-wishlist') toggleWishlist(id);
        if (action === 'add-cart') addCart(id);
        if (action === 'quick-view') openQuickView(id);
        if (action === 'cart-increase') changeCart(id, 1);
        if (action === 'cart-decrease') changeCart(id, -1);
        if (action === 'cart-remove') removeCart(id);
        if (action === 'close-modal') closeModal();
        if (action === 'back-to-top') scrollTo({ top: 0, behavior: 'smooth' });
        if (action === 'account') toast('Account pages can be connected to your backend route.');
        if (action === 'wishlist') toast(`${state.wishlist.size} product${state.wishlist.size === 1 ? '' : 's'} saved in your wishlist.`);
      }

      const prev = event.target.closest('[data-rail-prev]');
      if (prev) scrollRail(prev.dataset.railPrev, -1);
      const next = event.target.closest('[data-rail-next]');
      if (next) scrollRail(next.dataset.railNext, 1);

      const heroDirection = event.target.closest('[data-hero]');
      if (heroDirection) {
        updateHero(state.heroIndex + (heroDirection.dataset.hero === 'next' ? 1 : -1));
        startHeroAuto();
      }
      const heroIndex = event.target.closest('[data-hero-index]');
      if (heroIndex) { updateHero(Number(heroIndex.dataset.heroIndex)); startHeroAuto(); }

      const viewButton = event.target.closest('[data-view-target]');
      if (viewButton) setProductView(viewButton.dataset.viewTarget, viewButton.dataset.view);

      const department = event.target.closest('[data-department]');
      if (department) renderDepartment(department.dataset.department);

      const drawerTab = event.target.closest('[data-drawer-tab]');
      if (drawerTab) {
        $$('[data-drawer-tab]').forEach(button => {
          const active = button === drawerTab;
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-selected', String(active));
        });
        $$('[data-drawer-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.drawerPanel === drawerTab.dataset.drawerTab));
      }

      const copyButton = event.target.closest('[data-copy-code]');
      if (copyButton) {
        const code = copyButton.dataset.copyCode;
        navigator.clipboard?.writeText(code).catch(() => {});
        copyButton.textContent = 'Copied';
        toast(`Coupon ${code} copied.`);
        setTimeout(() => { copyButton.textContent = 'Copy code'; }, 1800);
      }

      if (!event.target.closest('.category-launcher')) {
        $('.category-launcher')?.classList.remove('is-open');
        $('[data-action="toggle-categories"]')?.setAttribute('aria-expanded', 'false');
      }
      if (!event.target.closest('.site-search')) byId('searchResults').hidden = true;
    });

    byId('siteSearch').addEventListener('submit', event => {
      event.preventDefault();
      const value = byId('searchInput').value.trim();
      if (value) toast(`Search page can receive query: “${value}”.`);
    });
    byId('searchInput').addEventListener('input', event => performSearch(event.target.value));
    byId('searchInput').addEventListener('focus', event => performSearch(event.target.value));

    const slider = byId('heroSlider');
    slider.addEventListener('mouseenter', () => clearInterval(state.heroTimer));
    slider.addEventListener('mouseleave', startHeroAuto);
    let touchStart = 0;
    slider.addEventListener('touchstart', event => { touchStart = event.touches[0].clientX; clearInterval(state.heroTimer); }, { passive: true });
    slider.addEventListener('touchend', event => {
      const diff = event.changedTouches[0].clientX - touchStart;
      if (Math.abs(diff) > 45) updateHero(state.heroIndex + (diff < 0 ? 1 : -1));
      startHeroAuto();
    }, { passive: true });

    byId('newsletterForm').addEventListener('submit', event => {
      event.preventDefault();
      const input = byId('newsletterEmail');
      toast(`Subscription received for ${input.value}.`);
      input.value = '';
    });

    addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closePanel(byId('mobileDrawer'), byId('drawerBackdrop'));
        closePanel(byId('cartDrawer'), byId('cartBackdrop'));
        closeModal();
      }
    });

    addEventListener('scroll', () => byId('siteHeader').classList.toggle('is-scrolled', scrollY > 20), { passive: true });
    addEventListener('scroll', () => $('.back-to-top').classList.toggle('is-visible', scrollY > 700), { passive: true });
  }

  function init() {
    API.home().then(data => {
      state.data = data;
      state.products = new Map(data.products.map(product => [Number(product.id), product]));
      renderNavigation();
      renderHero();
      renderCategories();
      renderProductGroups();
      renderDepartments();
      renderBestsellers();
      renderReviews();
      renderBlogAndSocial();
      initCountdowns();
      updateCartUI();
      updateWishlistUI();
      initEvents();
      document.documentElement.classList.add('is-ready');
    }).catch(error => {
      console.error(error);
      document.body.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;padding:30px;font-family:Arial,sans-serif"><div style="max-width:560px;text-align:center"><h1>Unable to load homepage data</h1><p>Please run the project through a local web server or restore <code>data/home.json</code>.</p></div></main>`;
    });
  }

  init();
})();
