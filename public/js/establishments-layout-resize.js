/**
 * Drag the handle between Places and Map to resize the map column (xl+).
 * Persists width in localStorage; middle column grows/shrinks with 1fr.
 */
(function () {
  var LS_KEY = 'tafteria.establishmentsMapWidthPx';
  var DEFAULT_MAP_W = 380;
  var MIN_MAP = 260;
  var MIN_PLACES = 220;
  var HANDLE_W = 10;
  var FILTERS_MAX = 240;

  function getGrid() {
    return document.getElementById('establishments-layout-grid');
  }

  function clampMapWidth(px, gridEl) {
    if (!gridEl) return DEFAULT_MAP_W;
    var gridW = gridEl.getBoundingClientRect().width;
    var reserved = FILTERS_MAX + HANDLE_W + MIN_PLACES + 48;
    var maxMap = Math.max(MIN_MAP, gridW - reserved);
    return Math.round(Math.min(maxMap, Math.max(MIN_MAP, px)));
  }

  function applyMapWidth(grid, widthPx) {
    if (!grid || !window.matchMedia('(min-width: 1280px)').matches) return;
    var w = clampMapWidth(widthPx, grid);
    grid.style.gridTemplateColumns =
      'minmax(200px, ' +
      FILTERS_MAX +
      'px) minmax(' +
      MIN_PLACES +
      'px, 1fr) ' +
      HANDLE_W +
      'px ' +
      w +
      'px';
  }

  function init() {
    var grid = getGrid();
    var handle = document.querySelector('.establishments-resize-handle');
    if (!grid || !handle) return;

    var saved = localStorage.getItem(LS_KEY);
    var initialW = saved ? parseInt(saved, 10) : DEFAULT_MAP_W;
    if (!isNaN(initialW)) {
      applyMapWidth(grid, initialW);
    }

    function onWindowResize() {
      if (!window.matchMedia('(min-width: 1280px)').matches) {
        grid.style.gridTemplateColumns = '';
        return;
      }
      var current = localStorage.getItem(LS_KEY);
      var w = current ? parseInt(current, 10) : DEFAULT_MAP_W;
      applyMapWidth(grid, isNaN(w) ? DEFAULT_MAP_W : w);
    }
    window.addEventListener('resize', onWindowResize);

    var startX;
    var startMapW;

    function invalidateMap() {
      if (typeof window.invalidateEstablishmentsMap === 'function') {
        window.invalidateEstablishmentsMap();
      }
    }

    handle.addEventListener('mousedown', function (e) {
      if (!window.matchMedia('(min-width: 1280px)').matches) return;
      e.preventDefault();
      var mapCol = document.querySelector('.establishments-col-map');
      if (!mapCol) return;
      startMapW = mapCol.getBoundingClientRect().width;
      startX = e.clientX;
      document.body.classList.add('is-resizing-establishments-layout');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    function onMove(e) {
      var dx = e.clientX - startX;
      var next = startMapW - dx;
      applyMapWidth(grid, next);
      invalidateMap();
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.classList.remove('is-resizing-establishments-layout');
      var mapCol = document.querySelector('.establishments-col-map');
      if (mapCol) {
        var w = Math.round(mapCol.getBoundingClientRect().width);
        localStorage.setItem(LS_KEY, String(w));
      }
      invalidateMap();
    }

    handle.addEventListener('dblclick', function (e) {
      if (!window.matchMedia('(min-width: 1280px)').matches) return;
      e.preventDefault();
      localStorage.removeItem(LS_KEY);
      applyMapWidth(grid, DEFAULT_MAP_W);
      invalidateMap();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
