/**
 * Single-establishment map on detail page — #establishment-geo-json (one GeoJSON Feature).
 */
(function () {
  const TAFT_CENTER = [14.5648, 120.9932];
  const DEFAULT_ZOOM = 17;

  function init() {
    var mapEl = document.getElementById('establishment-map');
    var jsonEl = document.getElementById('establishment-geo-json');
    if (!mapEl || !jsonEl || typeof L === 'undefined') return;

    var data;
    try {
      data = JSON.parse(jsonEl.textContent);
    } catch (e) {
      console.error('establishment-detail-map: invalid JSON', e);
      return;
    }

    if (!data || !data.geometry || data.geometry.type !== 'Point') return;

    var c = data.geometry.coordinates;
    var lat = c[1];
    var lng = c[0];
    var props = data.properties || {};

    var map = L.map(mapEl, { scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    map.setView([lat, lng], DEFAULT_ZOOM);

    var marker = L.marker([lat, lng]).addTo(map);
    var imgSrc = props.mainImageUrl || props.mainImage || '';
    var imgHtml = imgSrc
      ? '<img src="' +
        String(imgSrc).replace(/"/g, '&quot;') +
        '" alt="" style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-bottom:8px"/>'
      : '';
    var title = props.name ? '<strong>' + String(props.name).replace(/</g, '&lt;') + '</strong>' : 'Location';
    marker.bindPopup(imgHtml + title, { maxWidth: 280 });

    setTimeout(function () {
      map.invalidateSize();
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
