(() => {
  'use strict';

  const CART_KEY = 'fashionhub-demo-cart-v2';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const addSelector = '[data-action="add-cart"][data-product-id]';
  const cartMutationSelector = '[data-action="cart-remove"],[data-action="cart-decrease"],[data-action="cart-increase"]';
  const svg = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  function readCart() {
    try {
      const value = JSON.parse(localStorage.getItem(CART_KEY));
      return value && typeof value === 'object' ? value : {};
    } catch (_) {
      return {};
    }
  }

  function inCart(id) {
    return Number(readCart()[id] || 0) > 0;
  }

  function isCardButton(button) {
    return button.classList.contains('add-button') || !!button.closest('.product-card,.digital-card');
  }

  function renderButton(button, added) {
    if (!button || !button.matches(addSelector)) return;
    const cardButton = isCardButton(button);
    button.classList.toggle('is-added', added);
    button.disabled = added;
    button.setAttribute('aria-disabled', String(added));

    if (added) {
      button.innerHTML = `${svg('check')}<span>Added</span>`;
      button.setAttribute('aria-label', 'Product added to cart');
      return;
    }

    if (cardButton) {
      button.innerHTML = `${svg('cart')}<span>Add to cart</span>`;
      button.setAttribute('aria-label', 'Add product to cart');
    }
  }

  function syncButtons(root = document) {
    root.querySelectorAll?.(addSelector).forEach(button => renderButton(button, inCart(button.dataset.productId)));
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

  function cartTarget() {
    return document.querySelector('[data-action="open-cart"] .action-icon') ||
      document.querySelector('[data-action="open-cart"] svg') ||
      document.querySelector('[data-action="open-cart"]');
  }

  function pulseCart(target) {
    if (!target) return;
    target.classList.remove('fh-cart-hit');
    void target.offsetWidth;
    target.classList.add('fh-cart-hit');
    setTimeout(() => target.classList.remove('fh-cart-hit'), 650);
  }

  function flyToCart(image, target) {
    if (!image || !target || reduceMotion.matches) {
      pulseCart(target);
      return;
    }

    const source = image.getBoundingClientRect();
    const destination = target.getBoundingClientRect();
    if (!source.width || !source.height || !destination.width || !destination.height) {
      pulseCart(target);
      return;
    }

    const size = Math.max(52, Math.min(92, source.width, source.height));
    const startX = source.left + source.width / 2 - size / 2;
    const startY = source.top + source.height / 2 - size / 2;
    const endX = destination.left + destination.width / 2 - size / 2;
    const endY = destination.top + destination.height / 2 - size / 2;
    const dx = endX - startX;
    const dy = endY - startY;

    const flyer = image.cloneNode(false);
    flyer.className = 'fh-cart-fly';
    flyer.removeAttribute('id');
    flyer.setAttribute('aria-hidden', 'true');
    Object.assign(flyer.style, {
      left: `${startX}px`,
      top: `${startY}px`,
      width: `${size}px`,
      height: `${size}px`
    });
    document.body.appendChild(flyer);

    const animation = flyer.animate([
      { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
      { transform: `translate3d(${dx * .56}px,${dy * .38 - 46}px,0) scale(.72)`, opacity: .96, offset: .52 },
      { transform: `translate3d(${dx}px,${dy}px,0) scale(.16)`, opacity: .08 }
    ], {
      duration: 720,
      easing: 'cubic-bezier(.18,.82,.24,1)',
      fill: 'forwards'
    });

    animation.finished.catch(() => {}).finally(() => {
      flyer.remove();
      pulseCart(target);
    });
  }

  function afterCartChange() {
    requestAnimationFrame(() => requestAnimationFrame(() => syncButtons()));
  }

  function bind() {
    syncButtons();

    document.addEventListener('click', event => {
      const addButton = event.target.closest(addSelector);
      if (addButton && !addButton.disabled) {
        const image = sourceImage(addButton);
        const target = cartTarget();
        flyToCart(image, target);
        setTimeout(() => {
          renderButton(addButton, true);
          syncButtons();
        }, 0);
        return;
      }

      if (event.target.closest(cartMutationSelector)) afterCartChange();
    }, true);

    addEventListener('storage', event => {
      if (event.key === CART_KEY) syncButtons();
    });

    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches?.(addSelector)) renderButton(node, inCart(node.dataset.productId));
        syncButtons(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
