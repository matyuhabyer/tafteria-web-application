const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildQuery,
  bboxAround,
  clampRadius,
  distanceMeters,
  mapillaryIdFrom,
  normalizeResponse,
  selectNearestMapillaryImage,
} = require('../services/openStreetMapPlaces');

test('Overpass query is narrowly scoped to named food amenities around DLSU', () => {
  const query = buildQuery({ lat: 14.5648, lng: 120.9932 }, 1400);
  assert.match(query, /around:1400,14\.5648,120\.9932/);
  assert.match(query, /restaurant\|cafe\|fast_food\|food_court\|ice_cream/);
  assert.match(query, /\["name"\]/);
});

test('radius is constrained to protect the shared Overpass service', () => {
  assert.equal(clampRadius(50), 300);
  assert.equal(clampRadius(9000), 2500);
  assert.equal(clampRadius('invalid'), 1400);
});

test('OpenStreetMap elements are normalized and ordered by distance', () => {
  const center = { lat: 14.5648, lng: 120.9932 };
  const places = normalizeResponse({ elements: [
    { type: 'node', id: 2, lat: 14.57, lon: 120.999, tags: { name: 'Far Café', amenity: 'cafe' } },
    { type: 'node', id: 1, lat: 14.565, lon: 120.993, tags: { name: 'Near Kitchen', amenity: 'restaurant', cuisine: 'filipino;asian', mapillary: '1099638047265111' } },
  ] }, center);

  assert.equal(places.length, 2);
  assert.equal(places[0].name, 'Near Kitchen');
  assert.deepEqual(places[0].cuisine, ['filipino', 'asian']);
  assert.equal(places[0].category, 'Restaurant');
  assert.equal(places[0].mapillaryId, '1099638047265111');
  assert.match(places[0].mapillaryUrl, /pKey=1099638047265111/);
  assert.ok(distanceMeters(center, places[0]) < distanceMeters(center, places[1]));
});

test('invalid Mapillary references are not exposed to clients', () => {
  assert.equal(mapillaryIdFrom({ mapillary: 'valid_photo-id' }), 'valid_photo-id');
  assert.equal(mapillaryIdFrom({ mapillary: 'https://example.com/?token=secret' }), '');
});

test('photo-linked places are retained beyond the nearest result limit', () => {
  const center = { lat: 14.5648, lng: 120.9932 };
  const elements = Array.from({ length: 101 }, (_, index) => ({
    type: 'node',
    id: index + 1,
    lat: center.lat + index * 0.00001,
    lon: center.lng,
    tags: { name: `Place ${index + 1}`, amenity: 'restaurant' },
  }));
  elements[100].tags.mapillary = 'photo_101';

  const places = normalizeResponse({ elements }, center);
  assert.equal(places.length, 101);
  assert.equal(places.at(-1).mapillaryId, 'photo_101');
});

test('Mapillary search bbox stays centered on the establishment', () => {
  const bbox = bboxAround({ lat: 14.5648, lng: 120.9932 }, 60).split(',').map(Number);
  assert.equal(bbox.length, 4);
  assert.ok(bbox[0] < 120.9932 && bbox[2] > 120.9932);
  assert.ok(bbox[1] < 14.5648 && bbox[3] > 14.5648);
  assert.ok(distanceMeters({ lat: 14.5648, lng: 120.9932 }, { lat: bbox[3], lng: 120.9932 }) <= 61);
});

test('nearest usable Mapillary image is selected only inside the safety radius', () => {
  const point = { lat: 14.5648, lng: 120.9932 };
  const images = [
    { id: 'far_image', computed_geometry: { coordinates: [120.9942, 14.5658] }, thumb_1024_url: 'https://example.com/far.jpg' },
    { id: 'near_image', computed_geometry: { coordinates: [120.99325, 14.56482] }, thumb_1024_url: 'https://example.com/near.jpg', captured_at: 123 },
    { id: 'no_thumbnail', computed_geometry: { coordinates: [120.9932, 14.5648] } },
  ];
  const selected = selectNearestMapillaryImage(images, point, 60);
  assert.equal(selected.id, 'near_image');
  assert.equal(selected.matchType, 'nearby');
  assert.ok(selected.distanceMeters < 10);
  assert.equal(selectNearestMapillaryImage([images[0]], point, 60), null);
});
