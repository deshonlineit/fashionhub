(() => {
  'use strict';

  const script = document.currentScript;
  const scriptUrl = new URL(script?.src || 'assets/js/home-storefront-bridge.js', location.href);
  const rootUrl = new URL('../../', scriptUrl);
  const fallback = window.__FASHIONHUB_HOME__;
  const categoryTree = window.FASHIONHUB_CATEGORY_TREE || fallback?.categoryTree || [];

  async function fetchStorefront() {
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
      const data = payload.data;
      if (Array.isArray(categoryTree) && categoryTree.length) data.categoryTree = categoryTree;
      window.FASHIONHUB_DATA = data;
      document.documentElement.dataset.catalogSource = 'mysql';
      return data;
    } catch (error) {
      console.warn('[FashionHub] MySQL homepage catalog unavailable; bundled fallback is active.', error.message);
      if (fallback && typeof fallback === 'object') {
        if (Array.isArray(categoryTree) && categoryTree.length) fallback.categoryTree = categoryTree;
        window.FASHIONHUB_DATA = fallback;
        document.documentElement.dataset.catalogSource = 'fallback';
        return fallback;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  // app.js already awaits API.home(). Its existing fallback branch returns this
  // Promise, so no rendering code needs to be duplicated or rewritten.
  window.__FASHIONHUB_HOME__ = fetchStorefront();
})();
