(() => {
  'use strict';

  const DESKTOP = '(min-width: 981px)';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let hoverTimer = 0;
  let readyObserver = null;

  const isDesktop = () => matchMedia(DESKTOP).matches;
  const text = el => (el?.textContent || '').trim().replace(/\s+/g, ' ');
  const isHomepage = () => !document.body.dataset.page && !!document.getElementById('heroSlider');
  const homepageReady = () => !isHomepage() || document.documentElement.classList.contains('is-ready');

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

    let removedActive = false;
    document.querySelectorAll('[data-cat-index], .category-mega > ul > li, [data-drawer-panel="categories"] .mobile-tree > li').forEach(el => {
      const label = el.matches('[data-cat-index]') ? text(el.querySelector('span')) : text(el.querySelector(':scope > a, :scope > .mobile-tree__row > a'));
      if (label.toUpperCase() === 'APPLE PARTS') {
        removedActive ||= el.classList.contains('is-active');
        el.remove();
      }
    });

    const menu = document.getElementById('desktopCategoryMenu');
    const first = menu?.querySelector('[data-cat-index]');
    if (first && (removedActive || !menu.querySelector('[data-cat-index].is-active'))) {
      first.click();
    }
  }

  function restructureDesktopNav() {
    if (!isDesktop() || !homepageReady()) return;

    const header = document.querySelector('.site-header');
    const navWrap = document.querySelector('.primary-nav-wrap');
    const nav = navWrap?.querySelector('.primary-nav');
    const launcher = document.querySelector('.category-launcher.desktop-only');
    const categoryMenu = document.getElementById('desktopCategoryMenu');

    if (!header || !navWrap || !nav || !launcher || !categoryMenu) return;
    if (navWrap.dataset.desktopStructured === '1') return;

    /*
     * Important: on the homepage app.js fills #desktopNav asynchronously.
     * Moving the launcher into #desktopNav before app.js finishes causes
     * renderNavigation() to delete the launcher and #desktopCategoryMenu.
     * We therefore only relocate it after the homepage adds html.is-ready.
     */
    nav.prepend(launcher);
    header.insertAdjacentElement('afterend', navWrap);

    const sentinel = document.createElement('div');
    sentinel.className = 'nav-sticky-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    navWrap.before(sentinel);
    navWrap.dataset.desktopStructured = '1';

    const stickyObserver = new IntersectionObserver(entries => {
      const entry = entries[0];
      navWrap.classList.toggle('is-stuck', !entry.isIntersecting && entry.boundingClientRect.top < 0);
    }, { threshold: 0 });
    stickyObserver.observe(sentinel);
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
      if (event.target.closest('.category-launcher')) return;
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

  function observeLateMenus() {
    if (document.documentElement.dataset.menuCleanupObserver === '1') return;
    document.documentElement.dataset.menuCleanupObserver = '1';
    const mo = new MutationObserver(records => {
      if (!records.some(record => [...record.addedNodes].some(node => node.nodeType === 1))) return;
      removeRedundantAppleParts();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => mo.disconnect(), 5000);
  }

  function finishMenuSetup() {
    if (!homepageReady()) return;
    removeRedundantAppleParts();
    restructureDesktopNav();
    bindMegaIntent();
    decorateLongGroups(document);
  }

  function waitForHomepageReady() {
    if (homepageReady()) {
      finishMenuSetup();
      return;
    }

    if (readyObserver) return;
    readyObserver = new MutationObserver(() => {
      if (!document.documentElement.classList.contains('is-ready')) return;
      readyObserver.disconnect();
      readyObserver = null;
      finishMenuSetup();
    });
    readyObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  function init() {
    ensureFavicon();
    removeRedundantAppleParts();
    bindOutsideClose();
    setupScrollReveal();
    observeLateMenus();
    waitForHomepageReady();

    addEventListener('resize', () => {
      clearTimeout(hoverTimer);
      if (homepageReady() && isDesktop()) restructureDesktopNav();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
