/**
 * Leaflet map for /establishments — loads GeoJSON from GET /api/establishments/geo
 * (includes mainImageUrl for popup images). Falls back to #establishments-geo-json if fetch fails.
 */
(function () {
  const TAFT_CENTER = [14.5648, 120.9932];
  const DEFAULT_ZOOM = 16;

  function readGeoFromDom() {
    const el = document.getElementById('establishments-geo-json');
    if (!el || !el.textContent.trim()) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      console.error('establishments-map: invalid GeoJSON in page', e);
      return null;
    }
  }

  function fetchGeoFromApi() {
    const q = window.location.search || '';
    return fetch('/api/establishments/geo' + q).then(function (r) {
      if (!r.ok) throw new Error('Geo API error');
      return r.json();
    });
  }

  function popupHtml(props) {
    var imgSrc = props.mainImageUrl || props.mainImage || '';
    var img = imgSrc
      ? '<img src="' +
        String(imgSrc).replace(/"/g, '&quot;') +
        '" alt="" style="width:100%;height:96px;object-fit:cover;border-radius:8px;margin-bottom:8px"/>'
      : '';
    var rating =
      typeof props.rating === 'number'
        ? '<p style="margin:0 0 8px;font-size:13px;color:#444">' + props.rating.toFixed(1) + ' ★</p>'
        : '';
    var cat = props.category
      ? '<span style="font-size:11px;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:9999px">' +
        String(props.category).replace(/</g, '&lt;') +
        '</span>'
      : '';
    var name = String(props.name || 'Place').replace(/</g, '&lt;');
    var url = String(props.url || '#').replace(/"/g, '&quot;');
    return (
      '<div style="min-width:200px;max-width:260px">' +
      img +
      '<p style="font-weight:700;margin:0 0 6px;color:#111">' +
      name +
      '</p>' +
      rating +
      (cat ? '<p style="margin:8px 0 0">' + cat + '</p>' : '') +
      '<a href="' +
      url +
      '" style="display:inline-block;margin-top:10px;font-size:13px;font-weight:600;color:#14532d">View details →</a></div>'
    );
  }

  function init() {
    var mapEl = document.getElementById('establishments-map');
    if (!mapEl || typeof L === 'undefined') return;

    var promise = fetchGeoFromApi().catch(function () {
      var geo = readGeoFromDom();
      return geo && geo.features ? geo : { type: 'FeatureCollection', features: [] };
    });

    promise
      .then(function (data) {
        if (!data) data = { type: 'FeatureCollection', features: [] };
        if (!data.features) data.features = [];

        var map = L.map(mapEl, { scrollWheelZoom: true });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        var bounds = [];
        var group = L.featureGroup();

        data.features.forEach(function (f) {
          if (!f.geometry || f.geometry.type !== 'Point') return;
          var c = f.geometry.coordinates;
          var lng = c[0];
          var lat = c[1];
          var props = f.properties || {};
          var m = L.marker([lat, lng]);
          m.bindPopup(popupHtml(props), { maxWidth: 280 });
          group.addLayer(m);
          bounds.push([lat, lng]);
        });

        group.addTo(map);

        if (bounds.length === 0) {
          map.setView(TAFT_CENTER, DEFAULT_ZOOM);
        } else if (bounds.length === 1) {
          map.setView(bounds[0], DEFAULT_ZOOM);
        } else {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
        }

        window.__tafteriaEstablishmentsMap = map;
        window.invalidateEstablishmentsMap = function () {
          if (window.__tafteriaEstablishmentsMap) {
            window.__tafteriaEstablishmentsMap.invalidateSize();
          }
        };

        setTimeout(function () {
          map.invalidateSize();
        }, 100);
      })
      .catch(function (err) {
        console.error('establishments-map:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
