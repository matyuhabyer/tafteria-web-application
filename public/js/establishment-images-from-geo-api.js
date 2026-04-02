/**
 * Set establishment card images from the same APIs as the Leaflet map:
 * GET /api/establishments/geo (GeoJSON features include mainImageUrl) plus
 * GET /api/establishments for any place missing from geo (no lat/lng yet).
 *
 * Optional: window.__establishmentImgQuery — e.g. "" for home, or location.search on /establishments
 */
(function () {
  function mergeUrlById(geo, list) {
    var map = {};
    if (geo && Array.isArray(geo.features)) {
      geo.features.forEach(function (f) {
        var p = f.properties || {};
        if (p.id) {
          map[p.id] = p.mainImageUrl || p.mainImage || '';
        }
      });
    }
    if (Array.isArray(list)) {
      list.forEach(function (e) {
        if (e.id && !map[e.id]) {
          map[e.id] = e.mainImageUrl || e.mainImage || '';
        }
      });
    }
    return map;
  }

  function run() {
    var q =
      typeof window.__establishmentImgQuery === 'string'
        ? window.__establishmentImgQuery
        : window.location.search || '';

    var imgs = document.querySelectorAll('img[data-establishment-img][data-establishment-id]');
    if (!imgs.length) return;

    Promise.all([
      fetch('/api/establishments/geo' + q)
        .then(function (r) {
          return r.ok ? r.json() : { features: [] };
        })
        .catch(function () {
          return { features: [] };
        }),
      fetch('/api/establishments' + q)
        .then(function (r) {
          return r.ok ? r.json() : [];
        })
        .catch(function () {
          return [];
        }),
    ]).then(function (pair) {
      var urlById = mergeUrlById(pair[0], pair[1]);
      for (var i = 0; i < imgs.length; i++) {
        var img = imgs[i];
        var id = img.getAttribute('data-establishment-id');
        if (id && urlById[id]) {
          img.src = urlById[id];
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
