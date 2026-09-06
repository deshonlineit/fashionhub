(() => {
  'use strict';

  const NativeURLSearchParams = window.URLSearchParams;
  const script = document.currentScript;
  const scriptUrl = new URL(script?.src || 'assets/js/route-bootstrap.js', location.href);
  const rootUrl = new URL('../../', scriptUrl);
  const leaf = decodeURIComponent((location.pathname.split('/').pop() || '').trim());

  function slugify(value) {
    return String(value || '')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  function url(path = '') {
    return new URL(String(path).replace(/^\/+/, ''), rootUrl).pathname;
  }

  function routeParams() {
    const params = new NativeURLSearchParams();
    let match;
    if ((match = leaf.match(/^product-(?:.*-)?p(\d+)$/i))) params.set('id', match[1]);
    else if ((match = leaf.match(/^category-(.+)$/i))) params.set('cat', match[1]);
    else if ((match = leaf.match(/^search-(.+)$/i))) params.set('q', match[1].replace(/-/g, ' '));
    else if ((match = leaf.match(/^blog-(?:.*-)?p(\d+)$/i))) params.set('post', match[1]);
    else if ((match = leaf.match(/^blog-post-(\d+)$/i))) params.set('post', match[1]);
    else if (/^new-arrivals$/i.test(leaf)) params.set('sort', 'new');
    else if (/^deals$/i.test(leaf)) params.set('type', 'deals');
    return params;
  }

  const synthetic = routeParams();
  if (!location.search && synthetic.toString()) {
    function RouteAwareURLSearchParams(init) {
      return new NativeURLSearchParams(init === location.search ? synthetic.toString() : init);
    }
    RouteAwareURLSearchParams.prototype = NativeURLSearchParams.prototype;
    Object.setPrototypeOf(RouteAwareURLSearchParams, NativeURLSearchParams);
    window.URLSearchParams = RouteAwareURLSearchParams;
  }

  window.FASHIONHUB_ROUTES = Object.freeze({
    root: rootUrl.pathname,
    url,
    slugify,
    product(id, name = 'product') {
      return url(`product-${slugify(name) || 'product'}-p${encodeURIComponent(String(id || ''))}`);
    },
    category(value) { return url(`category-${slugify(value) || 'women'}`); },
    search(value) { return url(`search-${slugify(value) || 'products'}`); },
    page(value) { return url(String(value || '').replace(/\.html$/i, '')); }
  });
})();
