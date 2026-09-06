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
    if (!document.querySelector('link[rel~="icon"]')) {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.href = 'assets/images/favicon.svg';
      document.head.appendChild(link);
    }

    if (!document.querySelector('link[href="assets/css/sticky-header.css"]')) {
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = 'assets/css/sticky-header.css';
      document.head.appendChild(style);
    }
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
    const navWrap = header?.querySelector('.primary-nav-wrap') || document.querySelector('.primary-nav-wrap');
    const nav = navWrap?.querySelector('.primary-nav');
    const launcher = document.querySelector('.category-launcher.desktop-only');
    const categoryMenu = document.getElementById('desktopCategoryMenu');

    if (!header || !navWrap || !nav || !launcher || !categoryMenu) return;
    if (navWrap.dataset.desktopStructured === '1') return;

    /*
     * app.js fills #desktopNav asynchronously on the homepage, so the launcher
     * is moved only after html.is-ready. Keep the nav bar inside .site-header:
     * the whole header now sticks as one stable component while scrolling.
     */
    nav.prepend(launcher);
    if (navWrap.parentElement !== header) header.appendChild(navWrap);
    navWrap.dataset.desktopStructured = '1';
  }

  function setupStickyHeader() {
    const header = document.querySelector('.site-header');
    if (!header || header.dataset.stickyBound === '1') return;
    header.dataset.stickyBound = '1';

    let ticking = false;
    const update = () => {
      const active = window.scrollY > 24;
      header.classList.toggle('is-sticky-active', active);
      document.documentElement.classList.toggle('has-sticky-header', active);
      ticking = false;
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    addEventListener('scroll', requestUpdate, { passive: true });
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
    setupStickyHeader();
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
    setupStickyHeader();
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