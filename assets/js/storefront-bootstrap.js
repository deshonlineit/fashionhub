(() => {
  'use strict';

  const script = document.currentScript;
  const scriptUrl = new URL(script?.src || 'assets/js/storefront-bootstrap.js', location.href);
  const rootUrl = new URL('../../', scriptUrl);
  const page = document.body?.dataset.page || '';
  const version = '0.3.0-dev';
  const fallback = window.FASHIONHUB_DATA || window.__FASHIONHUB_HOME__ || null;
  const categoryTree = window.FASHIONHUB_CATEGORY_TREE || fallback?.categoryTree || [];

  function storefrontCategories(data) {
    const source = Array.isArray(fallback?.categories) ? fallback.categories : [];
    const products = Array.isArray(data?.products) ? data.products : [];
    if (!source.length || !products.length) return data?.categories || source;

    return source.map(category => {
      const id = String(category.id || '').toLowerCase();
      const first = String(category.name || id).toLowerCase().split(/\s|&/).filter(Boolean)[0] || id;
      const count = products.filter(product => {
        const productCategory = String(product.category || '').toLowerCase();
        const department = String(product.department || '').toLowerCase();
        if (id === 'digital') return product.type === 'digital';
        if (id === 'electronics') return department.includes('electronics');
        return productCategory.includes(first) || department.includes(first);
      }).length;
      return { ...category, count };
    });
  }

  function applyData(data, source) {
    if (!data || typeof data !== 'object') return null;
    if (source === 'mysql') data.categories = storefrontCategories(data);
    if (Array.isArray(categoryTree) && categoryTree.length) data.categoryTree = categoryTree;
    window.__FASHIONHUB_HOME__ = data;
    window.FASHIONHUB_DATA = data;
    document.documentElement.dataset.catalogSource = source;
    return data;
  }

  async function loadCatalog() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(new URL('api/v1/storefront/', rootUrl), {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Storefront API returned ${response.status}`);
      const payload = await response.json();
      if (!payload?.ok || !payload.data?.products?.length) throw new Error('Storefront API returned an empty catalog.');
      return applyData(payload.data, 'mysql');
    } catch (error) {
      if (fallback) {
        console.warn('[FashionHub] MySQL catalog unavailable; bundled storefront fallback is active.', error.message);
        return applyData(fallback, 'fallback');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const node = document.createElement('script');
      const url = new URL(path, rootUrl);
      url.searchParams.set('v', version);
      node.src = url.href;
      node.async = false;
      node.onload = resolve;
      node.onerror = () => reject(new Error(`Unable to load ${path}`));
      document.body.appendChild(node);
    });
  }

  async function boot() {
    try {
      await loadCatalog();
      await loadScript('assets/js/cart-effects.js');
      await loadScript('assets/js/pages.js');

      if (page === 'product') await loadScript('assets/js/product-page.js');
      if (page === 'checkout') await loadScript('assets/js/checkout.js');
      if (page === 'account') await loadScript('assets/js/account.js');

      await loadScript('assets/js/category-hover.js');
      window.dispatchEvent(new CustomEvent('fashionhub:storefront-ready', {
        detail: {
          source: document.documentElement.dataset.catalogSource || 'unknown',
          version
        }
      }));
    } catch (error) {
      console.error('[FashionHub] Storefront bootstrap failed.', error);
      const root = document.getElementById('pageRoot');
      if (root) {
        root.innerHTML = '<div style="min-height:55vh;display:grid;place-items:center;padding:30px;text-align:center"><div><h1>Unable to load the storefront</h1><p>Please verify the database catalog or restore the bundled storefront data.</p></div></div>';
      }
    }
  }

  boot();
})();
