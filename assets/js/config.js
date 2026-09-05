/**
 * Storefront API configuration.
 * Keep these defaults for the bundled static JSON demo.
 * PHP example: apiBase = 'backend-examples/php', endpoint = 'home.php'
 * Laravel example: apiBase = '/api/storefront', endpoint = 'home'
 */
window.FASHIONHUB_API_BASE = window.FASHIONHUB_API_BASE || 'data';
window.FASHIONHUB_HOME_ENDPOINT = window.FASHIONHUB_HOME_ENDPOINT || 'home.json';

// Shared navigation refinement stylesheet.
if (!document.querySelector('link[href="assets/css/nav-fix.css"]')) {
  const navStylesheet = document.createElement('link');
  navStylesheet.rel = 'stylesheet';
  navStylesheet.href = 'assets/css/nav-fix.css';
  document.head.appendChild(navStylesheet);
}
