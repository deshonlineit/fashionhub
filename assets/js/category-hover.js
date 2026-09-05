(() => {
  'use strict';

  const activate = item => {
    if (!item || item.classList.contains('is-active')) return;
    item.click();
  };

  const bind = () => {
    const menu = document.getElementById('desktopCategoryMenu');
    if (!menu || menu.dataset.hoverBound === '1') return;
    menu.dataset.hoverBound = '1';

    menu.addEventListener('pointerover', event => {
      if (!matchMedia('(min-width: 981px)').matches) return;
      activate(event.target.closest('[data-cat-index]'));
    });

    menu.addEventListener('focusin', event => {
      activate(event.target.closest('[data-cat-index]'));
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
