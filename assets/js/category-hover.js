(() => {
  'use strict';

  const DESKTOP = '(min-width: 981px)';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let readyObserver = null;

  const isDesktop = () => matchMedia(DESKTOP).matches;
  const isHomepage = () => !document.body.dataset.page && !!document.getElementById('heroSlider');
  const homepageReady = () => !isHomepage() || document.documentElement.classList.contains('is-ready');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const slugify = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  function loadStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = href;
    document.head.appendChild(style);
  }

  function ensureAssets() {
    if (!document.querySelector('link[rel~="icon"]')) {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.href = 'assets/images/favicon.svg';
      document.head.appendChild(link);
    }
    loadStylesheet('assets/css/sticky-header.css');
    loadStylesheet('assets/css/desktop-category-slider.css');
  }

  function removeRedundantAppleParts() {
    const strip = items => Array.isArray(items)
      ? items.filter(item => String(item?.label || '').trim().toUpperCase() !== 'APPLE PARTS')
      : items;

    if (Array.isArray(window.FASHIONHUB_CATEGORY_TREE)) {
      window.FASHIONHUB_CATEGORY_TREE = strip(window.FASHIONHUB_CATEGORY_TREE);
    }
    if (window.FASHIONHUB_DATA && Array.isArray(window.FASHIONHUB_DATA.categoryTree)) {
      window.FASHIONHUB_DATA.categoryTree = strip(window.FASHIONHUB_DATA.categoryTree);
    }
  }

  function categoryTree() {
    removeRedundantAppleParts();
    return window.FASHIONHUB_CATEGORY_TREE || window.FASHIONHUB_DATA?.categoryTree || [];
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

    nav.prepend(launcher);
    header.insertAdjacentElement('afterend', navWrap);

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

    navWrap.dataset.desktopStructured = '1';
  }

  function countLeaves(node) {
    const children = Array.isArray(node?.children) ? node.children : [];
    if (!children.length) return 1;
    return children.reduce((sum, child) => sum + countLeaves(child), 0);
  }

  function modelCount(node) {
    const children = Array.isArray(node?.children) ? node.children : [];
    return children.length ? children.reduce((sum, child) => sum + countLeaves(child), 0) : 0;
  }

  function flattenTree(items, parentPath = [], results = []) {
    items.forEach(item => {
      const path = [...parentPath, item.label];
      const children = Array.isArray(item.children) ? item.children : [];
      if (children.length) flattenTree(children, path, results);
      else results.push({ label: item.label, path });
    });
    return results;
  }

  function positionSlider(menu) {
    if (!menu || !isDesktop()) return;
    const launcher = menu.closest('.category-launcher');
    const button = launcher?.querySelector('.category-launcher__button');
    if (!button) return;

    const buttonRect = button.getBoundingClientRect();
    const panelWidth = Math.min(1040, Math.max(760, window.innerWidth - 32));
    const desiredLeft = Math.min(Math.max(16, buttonRect.left), Math.max(16, window.innerWidth - panelWidth - 16));
    menu.style.setProperty('--fh-cat-shift-x', `${Math.round(desiredLeft - buttonRect.left)}px`);
  }

  function buildDesktopCategorySlider() {
    if (!isDesktop() || !homepageReady()) return;

    const menu = document.getElementById('desktopCategoryMenu');
    const tree = categoryTree();
    if (!menu || !tree.length) return;
    if (menu.dataset.sliderReady === '1') {
      positionSlider(menu);
      return;
    }

    menu.dataset.sliderReady = '1';
    menu.classList.add('fh-category-slider');

    const searchable = flattenTree(tree);
    let activeIndex = 0;

    menu.innerHTML = `
      <div class="fh-cat-shell">
        <div class="fh-cat-topbar">
          <div class="fh-cat-title"><strong>Browse categories</strong><span>Find the exact model faster</span></div>
          <label class="fh-cat-search">
            ${icon('search')}
            <input type="search" autocomplete="off" placeholder="Search model or series..." aria-label="Search categories and models">
          </label>
        </div>
        <div class="fh-cat-body">
          <aside class="fh-cat-rail" aria-label="Product categories"></aside>
          <section class="fh-cat-stage" aria-live="polite">
            <div class="fh-cat-track">
              <div class="fh-cat-page fh-cat-page--groups"></div>
              <div class="fh-cat-page fh-cat-page--models"></div>
            </div>
          </section>
        </div>
      </div>`;

    const rail = menu.querySelector('.fh-cat-rail');
    const track = menu.querySelector('.fh-cat-track');
    const groupsPage = menu.querySelector('.fh-cat-page--groups');
    const modelsPage = menu.querySelector('.fh-cat-page--models');
    const searchInput = menu.querySelector('.fh-cat-search input');

    rail.innerHTML = tree.map((item, index) => `
      <button type="button" class="fh-cat-parent${index === activeIndex ? ' is-active' : ''}" data-fh-cat-index="${index}" aria-pressed="${index === activeIndex}">
        <span class="fh-cat-parent__icon">${icon(item.icon || 'grid')}</span>
        <span class="fh-cat-parent__copy"><strong>${esc(item.label)}</strong><small>${modelCount(item)} models</small></span>
        ${icon('chevron-right')}
      </button>`).join('');

    const renderGroups = index => {
      activeIndex = index;
      const item = tree[index] || tree[0];
      const children = Array.isArray(item?.children) ? item.children : [];
      rail.querySelectorAll('.fh-cat-parent').forEach((button, buttonIndex) => {
        const active = buttonIndex === activeIndex;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });

      track.classList.remove('is-detail');
      groupsPage.classList.remove('is-searching');
      groupsPage.innerHTML = `
        <div class="fh-cat-pagehead">
          <div><span class="fh-cat-kicker">Category</span><h3>${esc(item.label)}</h3><p>${children.length ? `${children.length} groups · ${modelCount(item)} models` : 'Products coming soon'}</p></div>
          <a href="category.html?cat=${encodeURIComponent(slugify(item.label))}" class="fh-cat-viewall">View all ${icon('arrow-right')}</a>
        </div>
        ${children.length ? `<div class="fh-cat-groups">${children.map((child, childIndex) => {
          const grandchildren = Array.isArray(child.children) ? child.children : [];
          if (!grandchildren.length) {
            return `<a class="fh-cat-group fh-cat-group--link" href="category.html?cat=${encodeURIComponent(slugify(child.label))}"><span><strong>${esc(child.label)}</strong><small>Open category</small></span>${icon('arrow-right')}</a>`;
          }
          return `<button type="button" class="fh-cat-group" data-fh-group-index="${childIndex}"><span><strong>${esc(child.label)}</strong><small>${grandchildren.length} models</small></span>${icon('arrow-right')}</button>`;
        }).join('')}</div>` : `<div class="fh-cat-empty"><div>${icon('box')}</div><h4>Nothing to browse yet</h4><p>This category is marked as available soon.</p></div>`}`;
    };

    const renderModels = groupIndex => {
      const item = tree[activeIndex] || tree[0];
      const group = item?.children?.[groupIndex];
      if (!group) return;
      const models = Array.isArray(group.children) ? group.children : [];
      modelsPage.innerHTML = `
        <div class="fh-cat-pagehead fh-cat-pagehead--detail">
          <button type="button" class="fh-cat-back" data-fh-back>${icon('chevron-left')}<span>Back to ${esc(item.label)}</span></button>
          <div class="fh-cat-detail-title"><span class="fh-cat-kicker">${esc(item.label)}</span><h3>${esc(group.label)}</h3><p>${models.length} models</p></div>
        </div>
        <div class="fh-cat-models">${models.map(model => `
          <a href="category.html?cat=${encodeURIComponent(slugify(model.label))}" class="fh-cat-model">
            <span>${esc(model.label)}</span>${icon('arrow-right')}
          </a>`).join('')}</div>`;
      requestAnimationFrame(() => track.classList.add('is-detail'));
    };

    const renderSearch = value => {
      const query = value.trim().toLowerCase();
      if (query.length < 2) {
        renderGroups(activeIndex);
        return;
      }
      const matches = searchable.filter(item => `${item.label} ${item.path.join(' ')}`.toLowerCase().includes(query)).slice(0, 24);
      track.classList.remove('is-detail');
      groupsPage.classList.add('is-searching');
      groupsPage.innerHTML = `
        <div class="fh-cat-pagehead">
          <div><span class="fh-cat-kicker">Search</span><h3>${esc(value.trim())}</h3><p>${matches.length} result${matches.length === 1 ? '' : 's'} shown</p></div>
          <button type="button" class="fh-cat-clear" data-fh-clear>Clear</button>
        </div>
        ${matches.length ? `<div class="fh-cat-results">${matches.map(result => `
          <a class="fh-cat-result" href="category.html?cat=${encodeURIComponent(slugify(result.label))}">
            <span><strong>${esc(result.label)}</strong><small>${result.path.slice(0, -1).map(esc).join(' / ')}</small></span>${icon('arrow-right')}
          </a>`).join('')}</div>` : `<div class="fh-cat-empty"><div>${icon('search')}</div><h4>No model found</h4><p>Try a shorter model number or series name.</p></div>`}`;
    };

    rail.addEventListener('click', event => {
      const parent = event.target.closest('[data-fh-cat-index]');
      if (!parent) return;
      searchInput.value = '';
      renderGroups(Number(parent.dataset.fhCatIndex));
    });

    groupsPage.addEventListener('click', event => {
      const group = event.target.closest('[data-fh-group-index]');
      if (group) renderModels(Number(group.dataset.fhGroupIndex));
      if (event.target.closest('[data-fh-clear]')) {
        searchInput.value = '';
        renderGroups(activeIndex);
        searchInput.focus();
      }
    });

    modelsPage.addEventListener('click', event => {
      if (!event.target.closest('[data-fh-back]')) return;
      track.classList.remove('is-detail');
    });

    searchInput.addEventListener('input', event => renderSearch(event.target.value));
    searchInput.addEventListener('keydown', event => {
      if (event.key === 'Escape' && searchInput.value) {
        event.stopPropagation();
        searchInput.value = '';
        renderGroups(activeIndex);
      }
    });

    renderGroups(activeIndex);
    positionSlider(menu);
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

    document.addEventListener('click', event => {
      const toggle = event.target.closest('[data-action="toggle-categories"]');
      if (!toggle) return;
      requestAnimationFrame(() => {
        const menu = document.getElementById('desktopCategoryMenu');
        if (menu) positionSlider(menu);
      });
    });
  }

  function setupScrollReveal() {
    if (reduceMotion.matches) return;
    document.documentElement.classList.add('motion-ready');

    const selector = [
      'main > section', '.product-card', '.campaign-card', '.blog-card', '.review-card',
      '.trust-strip article', '.exclusive-feature', '.department-showcase', '.page-banner',
      '.catalog-grid > *', '.footer-grid > section'
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
        records.forEach(record => record.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches?.(selector)) {
            node.classList.add('scroll-reveal');
            io.observe(node);
          }
          mark(node);
        }));
      });
      mo.observe(main, { childList: true, subtree: true });
    }
  }

  function observeLateMenus() {
    if (document.documentElement.dataset.menuCleanupObserver === '1') return;
    document.documentElement.dataset.menuCleanupObserver = '1';
    const mo = new MutationObserver(records => {
      const meaningful = records.some(record => [...record.addedNodes].some(node => node.nodeType === 1));
      if (!meaningful) return;
      removeRedundantAppleParts();
      if (homepageReady()) buildDesktopCategorySlider();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => mo.disconnect(), 7000);
  }

  function finishMenuSetup() {
    if (!homepageReady()) return;
    removeRedundantAppleParts();
    restructureDesktopNav();
    buildDesktopCategorySlider();
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
    ensureAssets();
    removeRedundantAppleParts();
    bindOutsideClose();
    setupScrollReveal();
    observeLateMenus();
    waitForHomepageReady();

    addEventListener('resize', () => {
      if (!homepageReady() || !isDesktop()) return;
      restructureDesktopNav();
      positionSlider(document.getElementById('desktopCategoryMenu'));
    }, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
