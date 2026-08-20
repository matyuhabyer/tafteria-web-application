(function () {
  function init() {
    var buttons = document.querySelectorAll('[data-establishments-view]');
    var grid = document.getElementById('establishments-layout-grid');
    if (!buttons.length || !grid) return;

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var view = button.getAttribute('data-establishments-view');
        grid.setAttribute('data-mobile-view', view);
        buttons.forEach(function (item) {
          item.classList.toggle('is-active', item === button);
        });
        if (view === 'map' && typeof window.invalidateEstablishmentsMap === 'function') {
          setTimeout(window.invalidateEstablishmentsMap, 80);
        }
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
