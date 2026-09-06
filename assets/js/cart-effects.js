(() => {
  'use strict';

  const CART_KEY = 'fashionhub-demo-cart-v2';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const addSelector = '[data-action="add-cart"][data-product-id]';
  const cartMutationSelector = '[data-action="cart-remove"],[data-action="cart-decrease"],[data-action="cart-increase"]';
  const svg = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const pending = new Set();

  function readCart() {
    try {
      const value = JSON.parse(localStorage.getItem(CART_KEY));
      return value && typeof value === 'object' ? value : {};
    } catch (_) {
      return {};
    }
  }

  function cartQuantity(id) {
    return Number(readCart()[id] || 0);
  }

  function renderButton(button, added) {
    if (!button || !button.matches(addSelector)) return;
    button.classList.add('fh-add-cart');
    button.classList.remove('is-adding');
    button.classList.toggle('is-added', added);
    button.disabled = added;
    button.setAttribute('aria-disabled', String(added));

    if (added) {
      button.innerHTML = `${svg('check')}<span>Added</span>`;
      button.setAttribute('aria-label', 'Product added to cart');
      return;
    }

    button.innerHTML = `${svg('cart')}<span>Add to cart</span>`;
    button.setAttribute('aria-label', 'Add product to cart');
  }

  function markAdding(id) {
    pending.add(String(id));
    document.querySelectorAll(addSelector).forEach(button => {
      if (String(button.dataset.productId) !== String(id)) return;
      button.classList.add('fh-add-cart');
      button.classList.remove('is-added');
      button.classList.add('is-adding');
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('aria-label', 'Adding product to cart');
      button.innerHTML = `${svg('cart')}<span>Adding…</span>`;
    });
  }

  function syncButtons(root = document) {
    const cart = readCart();
    const buttons = [];
    if (root.matches?.(addSelector)) buttons.push(root);
    root.querySelectorAll?.(addSelector).forEach(button => buttons.push(button));
    buttons.forEach(button => {
      const id = String(button.dataset.productId);
      const added = Number(cart[id] || 0) > 0;
      if (pending.has(id) && !added) return;
      renderButton(button, added);
    });
  }

  function sourceImage(button) {
    const scopes = [
      button.closest('.product-card'),
      button.closest('.digital-card'),
      button.closest('.quick-view'),
      button.closest('.product-layout'),
      button.closest('.product-summary')?.parentElement
    ].filter(Boolean);
    for (const scope of scopes) {
      const image = scope.querySelector('.product-card__media img,.quick-view__image img,.product-main-image img,img');
      if (image) return image;
    }
    return null;
  }

  function visibleScore(element) {
    if (!element) return -1;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return -1;
    const width = Math.max(0, Math.min(innerWidth, rect.right) - Math.max(0, rect.left));
    const height = Math.max(0, Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top));
    return width * height;
  }

  function productTarget(id) {
    const images = [];
    document.querySelectorAll(addSelector).forEach(button => {
      if (String(button.dataset.productId) !== String(id) || button.closest('.cart-drawer')) return;
      const image = sourceImage(button);
      if (image && !images.includes(image)) images.push(image);
    });
    images.sort((a, b) => visibleScore(b) - visibleScore(a));
    return images.find(image => visibleScore(image) > 0) || images[0] || null;
  }

  function isRenderable(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) > 0;
  }

  function cartTarget() {
    const sticky = document.querySelector('.primary-nav-wrap.is-stuck .fh-sticky-cart-action');
    if (isRenderable(sticky)) return sticky.querySelector('.fh-sticky-action-icon') || sticky;

    const candidates = [...document.querySelectorAll('[data-action="open-cart"]')]
      .filter(button => !button.closest('.cart-drawer') && isRenderable(button));
    const best = candidates.sort((a, b) => visibleScore(b) - visibleScore(a))[0];
    return best?.querySelector('.action-icon,.fh-sticky-action-icon') || best || null;
  }

  function pulseCart(target) {
    if (!target) return;
    target.classList.remove('fh-cart-hit');
    void target.offsetWidth;
    target.classList.add('fh-cart-hit');
    setTimeout(() => target.classList.remove('fh-cart-hit'), 760);
  }

  function pulseProduct(target) {
    const card = target?.closest?.('.product-card,.digital-card,.product-layout') || target;
    if (!card) return;
    card.classList.remove('fh-product-return-hit');
    void card.offsetWidth;
    card.classList.add('fh-product-return-hit');
    setTimeout(() => card.classList.remove('fh-product-return-hit'), 900);
  }

  function flyBetween(sourceElement, destinationElement, direction = 'to-cart') {
    return new Promise(resolve => {
      if (!sourceElement || !destinationElement || reduceMotion.matches) {
        if (direction === 'to-cart') pulseCart(destinationElement);
        else pulseProduct(destinationElement);
        resolve();
        return;
      }

      const source = sourceElement.getBoundingClientRect();
      const destination = destinationElement.getBoundingClientRect();
      if (!source.width || !source.height || !destination.width || !destination.height) {
        resolve();
        return;
      }

      const size = Math.max(54, Math.min(92, source.width, source.height));
      const startX = source.left + source.width / 2 - size / 2;
      const startY = source.top + source.height / 2 - size / 2;
      const endX = destination.left + destination.width / 2 - size / 2;
      const endY = destination.top + destination.height / 2 - size / 2;
      const dx = endX - startX;
      const dy = endY - startY;
      const reverse = direction === 'to-product';

      const flyer = sourceElement.cloneNode(false);
      flyer.className = `fh-cart-fly${reverse ? ' fh-cart-fly--return' : ''}`;
      flyer.removeAttribute('id');
      flyer.setAttribute('aria-hidden', 'true');
      Object.assign(flyer.style, {
        left: `${startX}px`,
        top: `${startY}px`,
        width: `${size}px`,
        height: `${size}px`
      });
      document.body.appendChild(flyer);

      const duration = reverse ? 900 : 1080;
      const arc = reverse ? -34 : -66;
      const animation = flyer.animate([
        { transform: 'translate3d(0,0,0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate3d(${dx * .34}px,${dy * .24 + arc}px,0) scale(${reverse ? .9 : .86}) rotate(${reverse ? '3deg' : '-4deg'})`, opacity: .98, offset: .34 },
        { transform: `translate3d(${dx * .72}px,${dy * .68 + arc * .35}px,0) scale(${reverse ? .76 : .52}) rotate(${reverse ? '-2deg' : '2deg'})`, opacity: .9, offset: .72 },
        { transform: `translate3d(${dx}px,${dy}px,0) scale(${reverse ? .62 : .14}) rotate(0deg)`, opacity: reverse ? .18 : .06 }
      ], {
        duration,
        easing: 'cubic-bezier(.18,.78,.2,1)',
        fill: 'forwards'
      });

      animation.finished.catch(() => {}).finally(() => {
        flyer.remove();
        if (reverse) pulseProduct(destinationElement);
        else pulseCart(destinationElement);
        resolve();
      });
    });
  }

  function syncStickyCount() {
    const source = document.getElementById('cartCount');
    const fallback = Object.values(readCart()).reduce((sum, value) => sum + Number(value || 0), 0);
    const count = source?.textContent?.trim() || String(fallback);
    document.querySelectorAll('.fh-sticky-cart-count').forEach(badge => {
      badge.textContent = count;
      badge.toggleAttribute('hidden', Number(count || 0) < 1);
    });
  }

  function ensureStickyActions() {
    const nav = document.querySelector('.primary-nav-wrap .primary-nav');
    if (!nav) return false;
    if (nav.querySelector('.fh-sticky-actions')) {
      syncStickyCount();
      return true;
    }

    const actions = document.createElement('div');
    actions.className = 'fh-sticky-actions';
    actions.setAttribute('aria-label', 'Sticky account actions');
    actions.innerHTML = `
      <a class="fh-sticky-action" href="account.html" aria-label="Account" title="Account">${svg('user')}</a>
      <button class="fh-sticky-action fh-sticky-cart-action" type="button" data-action="open-cart" aria-label="Open shopping cart" title="Cart">
        <span class="fh-sticky-action-icon">${svg('cart')}<b class="fh-sticky-cart-count" hidden>0</b></span>
      </button>`;
    nav.appendChild(actions);
    syncStickyCount();

    const source = document.getElementById('cartCount');
    if (source && source.dataset.stickyCountObserved !== '1') {
      source.dataset.stickyCountObserved = '1';
      new MutationObserver(syncStickyCount).observe(source, { childList: true, characterData: true, subtree: true });
    }
    return true;
  }

  function watchStickyActions() {
    if (ensureStickyActions()) return;
    const observer = new MutationObserver(() => {
      if (!ensureStickyActions()) return;
      observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 3500);
  }

  function openMiniCart() {
    const drawer = document.getElementById('cartDrawer');
    if (!drawer || drawer.classList.contains('is-open')) return;

    const modal = document.getElementById('quickViewModal');
    const wasModalOpen = !!modal?.classList.contains('is-open');
    if (wasModalOpen) {
      const close = modal.querySelector('[data-action="close-modal"]');
      close?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }

    const openers = [...document.querySelectorAll('[data-action="open-cart"]')]
      .filter(button => !button.closest('.cart-drawer'));
    const sticky = document.querySelector('.primary-nav-wrap.is-stuck .fh-sticky-cart-action');
    const opener = isRenderable(sticky) ? sticky : openers.find(isRenderable) || openers[0];
    if (!opener) return;

    setTimeout(() => {
      opener.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      drawer.classList.add('fh-cart-arrive');
      setTimeout(() => drawer.classList.remove('fh-cart-arrive'), 700);
    }, wasModalOpen ? 180 : 0);
  }

  function afterCartChange(delay = 60) {
    setTimeout(() => {
      syncButtons();
      syncStickyCount();
    }, delay);
  }

  function handleAdd(button) {
    const id = String(button.dataset.productId || '');
    if (!id || pending.has(id) || cartQuantity(id) > 0) return;

    const image = sourceImage(button);
    const target = cartTarget();
    markAdding(id);

    flyBetween(image, target, 'to-cart').then(() => {
      pending.delete(id);
      syncButtons();
      syncStickyCount();
      setTimeout(openMiniCart, 260);
    });
  }

  function handleReturn(button) {
    const id = String(button.dataset.productId || '');
    if (!id) return;
    const item = button.closest('.cart-item');
    const source = item?.querySelector('img');
    const destination = productTarget(id);
    if (source && destination) flyBetween(source, destination, 'to-product');
  }

  function bind() {
    syncButtons();
    watchStickyActions();

    document.addEventListener('click', event => {
      const addButton = event.target.closest(addSelector);
      if (addButton && !addButton.disabled) {
        handleAdd(addButton);
        return;
      }

      const remove = event.target.closest('[data-action="cart-remove"]');
      if (remove) {
        handleReturn(remove);
        afterCartChange(100);
        return;
      }

      const decrease = event.target.closest('[data-action="cart-decrease"]');
      if (decrease && cartQuantity(decrease.dataset.productId) <= 1) handleReturn(decrease);
      if (event.target.closest(cartMutationSelector)) afterCartChange(100);
    }, true);

    addEventListener('storage', event => {
      if (event.key !== CART_KEY) return;
      syncButtons();
      syncStickyCount();
    });

    const observer = new MutationObserver(records => {
      let needsButtonSync = false;
      let needsSticky = false;
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches?.(addSelector) || node.querySelector?.(addSelector)) needsButtonSync = true;
        if (node.matches?.('.primary-nav-wrap,.primary-nav') || node.querySelector?.('.primary-nav-wrap,.primary-nav')) needsSticky = true;
      }));
      if (needsButtonSync) syncButtons();
      if (needsSticky) ensureStickyActions();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
