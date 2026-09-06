(() => {
  'use strict';
  if (document.body.dataset.page !== 'product') return;

  const products = window.FASHIONHUB_DATA?.products || [];
  const legacyId = new URLSearchParams(location.search).get('id');
  const pathMatch = decodeURIComponent(location.pathname.split('/').pop() || '').match(/^product-(?:.*-)?p(\d+)$/i);
  const id = Number(pathMatch?.[1] || legacyId || 3);
  const product = products.find(item => Number(item.id) === id) || products[0];
  if (!product) return;

  const description = String(product.description || '').trim().slice(0, 158);
  document.title = `${product.name} — FashionHub`;

  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.append(meta);
  }
  meta.content = description || `Shop ${product.name} at FashionHub.`;

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.append(canonical);
  }
  canonical.href = `${location.origin}${location.pathname}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: [new URL(product.image, location.href).href],
    description: product.description,
    sku: `FH-${String(product.id).padStart(4, '0')}`,
    category: product.category,
    aggregateRating: product.rating && product.reviews ? {
      '@type': 'AggregateRating',
      ratingValue: Number(product.rating),
      reviewCount: Number(product.reviews)
    } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BDT',
      price: Number(product.price),
      availability: 'https://schema.org/InStock',
      url: canonical.href
    }
  };

  const oldSchema = document.getElementById('productStructuredData');
  oldSchema?.remove();
  const jsonLd = document.createElement('script');
  jsonLd.id = 'productStructuredData';
  jsonLd.type = 'application/ld+json';
  jsonLd.textContent = JSON.stringify(schema);
  document.head.append(jsonLd);

  document.addEventListener('click', event => {
    const option = event.target.closest('.option-buttons button');
    if (!option) return;
    const group = option.closest('.option-buttons');
    group?.querySelectorAll('button').forEach(button => button.classList.toggle('is-active', button === option));
  });
})();
