(() => {
  'use strict';

  const DESKTOP = '(min-width: 981px)';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let hoverTimer = 0;

  const isDesktop = () => matchMedia(DESKTOP).matches;
  const text = el => (el?.textContent || '').trim().replace(/\s+/g, ' ');

  function ensureFavicon() {
    if (document.querySelector('link[rel~="icon"]')) return;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = 'assets/images/favicon.svg';
    document.head.appendChild(link);
  }

  function removeRedundantAppleParts() {
    if (Array.isArray(window.FASHIONHUB_CATEGORY_TREE)) {
      window.FASHIONHUB_CATEGORY_TREE = window.FASHIONHUB_CATEGORY_TREE.filter(item => String(item?.label || '').toUpperCase() !== 'APPLE PARTS');
    }
    if (window.FASHIONHUB_DATA && Array.isArray(window.FASHIONHUB_DATA.categoryTree)) {
      window.FASHIONHUB_DATA.categoryTree = window.FASHIONHUB_DATA.categoryTree.filter(item => String(item?.label || '').toUpperCase() !== 'APPLE PARTS');
    }

    document.querySelectorAll('[data-cat-index], .category-mega > ul > li, [data-drawer-panel="categories"] .mobile-tree > li').forEach(el => {
      const label = el.matches('[data-cat-index]') ? text(el.querySelector('span')) : text(el.querySelector(':scope > a, :scope > .mobile-tree__row > a'));
      if (label.toUpperCase() === 'APPLE PARTS') el.remove();
    });
  }

  function restructureDesktopNav() {
    if (!isDesktop()) return;
    const header = document.querySelector('.site-header');
    const navWrap = document.querySelector('.primary-nav-wrap');
    const nav = navWrap?.querySelector('.primary-nav');
    const launcher = document.querySelector('.category-launcher.desktop-only');
    if (!header || !navWrap || !nav || !launcher) return;

    if (launcher.parentElement !== nav) nav.prepend(launcher);
    if (navWrap.previousElementSibling !== header) header.insertAdjacentElement('afterend', navWrap);

    if (!navWrap.previousElementSibling?.classList?.contains('nav-sticky-sentinel')) {
      const sentinel = document.createElement('div');
      sentinel.className = 'nav-sticky-sentinel';
      sentinel.setAttribute('aria-hidden', 'true');
      navWrap.before(sentinel);
      const stickyObserver = new IntersectionObserver(entries => {
        const entry = entries[0];
        navWrap.classList.toggle('is-stuck', !entry.isIntersecting && entry.boundingClientRect.top < 0);
      }, { threshold: 0 });
      stickyObserver.observe(sentinel);
    }
  }

  function decorateLongGroups(root = document) {
    root.querySelectorAll('.category-mega__columns section').forEach(section => {
      const count = section.querySelectorAll(':scope > a').length;
      section.classList.toggle('is-long', count >= 13 && count < 28);
      section.classList.toggle('is-very-long', count >= 28);
    });
  }

  function activateCategory(item) {
    if (!item || item.classList.contains('is-active')) return;
    item.click();
    requestAnimationFrame(() => decorateLongGroups(document));
  }

  function bindMegaIntent() {
    const menu = document.getElementById('desktopCategoryMenu');
    if (!menu || menu.dataset.intentBound === '1') return;
    menu.dataset.intentBound = '1';

    const bindItems = () => {
      menu.querySelectorAll('[data-cat-index]').forEach(item => {
        if (item.dataset.intentItemBound === '1') return;
        item.dataset.intentItemBound = '1';

        item.addEventListener('pointerenter', () => {
          if (!isDesktop()) return;
          clearTimeout(hoverTimer);
          hoverTimer = window.setTimeout(() => activateCategory(item), 180);
        });
        item.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
        item.addEventListener('focus', () => activateCategory(item));
      });
    };

    bindItems();
    menu.querySelector('.category-mega__details')?.addEventListener('pointerenter', () => clearTimeout(hoverTimer));

    const observer = new MutationObserver(() => {
      bindItems();
      decorateLongGroups(menu);
      removeRedundantAppleParts();
    });
    observer.observe(menu, { childList: true, subtree: true });
  }

  function bindOutsideClose() {
    if (document.documentElement.dataset.categoryOutsideBound === '1') return;
    document.documentElement.dataset.categoryOutsideBound = '1';
    document.addEventListener('pointerdown', event => {
      const launcher = event.target.closest('.category-launcher');
      if (launcher) return;
      const menu = document.getElementById('desktopCategoryMenu');
      const button = document.querySelector('[data-action="toggle-categories"]');
      menu?.classList.remove('is-open');
      document.querySelector('.category-launcher')?.classList.remove('is-open');
      button?.setAttribute('aria-expanded', 'false');
    }, { passive: true });
  }

  function setupScrollReveal() {
    if (reduceMotion.matches) return;
    document.documentElement.classList.add('motion-ready');

    const selector = [
      'main > section',
      '.product-card',
      '.campaign-card',
      '.blog-card',
      '.review-card',
      '.trust-strip article',
      '.exclusive-feature',
      '.department-showcase',
      '.page-banner',
      '.catalog-grid > *',
      '.footer-grid > section'
    ].join(',');

    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    const mark = root => {
      root.querySelectorAll?.(selector).forEach((el, index) => {
        if (el.classList.contains('scroll-reveal')) return;
        el.classList.add('scroll-reveal');
        el.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 55}ms`);
        io.observe(el);
      });
    };

    mark(document);
    const main = document.querySelector('main');
    if (main) {
      const mo = new MutationObserver(records => {
        for (const record of records) {
          record.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.matches?.(selector)) {
              node.classList.add('scroll-reveal');
              io.observe(node);
            }
            mark(node);
          });
        }
      });
      mo.observe(main, { childList: true, subtree: true });
    }
  }

  function init() {
    ensureFavicon();
    removeRedundantAppleParts();
    restructureDesktopNav();
    bindMegaIntent();
    decorateLongGroups(document);
    bindOutsideClose();
    setupScrollReveal();

    addEventListener('resize', () => {
      clearTimeout(hoverTimer);
      if (isDesktop()) restructureDesktopNav();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
