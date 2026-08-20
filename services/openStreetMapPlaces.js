const DEFAULT_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const FALLBACK_ENDPOINTS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const DEFAULT_CENTER = { lat: 14.5648, lng: 120.9932 };
const DEFAULT_RADIUS_METERS = 1400;
const DEFAULT_TTL_MS = 60 * 60 * 1000;
const MAX_NEAREST_PLACES = 100;
const MAX_LINKED_PHOTOS = 12;
const DEFAULT_MAPILLARY_SEARCH_RADIUS_METERS = 60;
const MAX_MAPILLARY_SEARCH_RADIUS_METERS = 100;
const USER_AGENT = 'Tafteria/1.0 (+https://github.com/matyuhabyer/tafteria-web-application)';
const MAPILLARY_GRAPH_ENDPOINT = 'https://graph.mapillary.com';

let cache = null;
const mapillaryImageCache = new Map();
const mapillaryNearbyCache = new Map();

function clampRadius(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_RADIUS_METERS;
  return Math.min(2500, Math.max(300, Math.round(parsed)));
}

function buildQuery(center = DEFAULT_CENTER, radiusMeters = DEFAULT_RADIUS_METERS) {
  const radius = clampRadius(radiusMeters);
  return `[out:json][timeout:20];
(
  nwr(around:${radius},${center.lat},${center.lng})["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"]["name"];
);
out center tags;`;
}

function distanceMeters(from, to) {
  const earthRadius = 6371000;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latDelta = radians(to.lat - from.lat);
  const lngDelta = radians(to.lng - from.lng);
  const lat1 = radians(from.lat);
  const lat2 = radians(to.lat);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;
  return Math.round(earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function categoryFor(amenity) {
  return ({
    restaurant: 'Restaurant',
    cafe: 'Café',
    fast_food: 'Fast food',
    food_court: 'Food court',
    ice_cream: 'Dessert',
  })[amenity] || 'Food spot';
}

function addressFrom(tags = {}) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return [street, tags['addr:suburb'] || tags['addr:district'], tags['addr:city']]
    .filter(Boolean)
    .join(', ');
}

function mapillaryIdFrom(tags = {}) {
  const id = String(tags.mapillary || '').trim();
  return /^[A-Za-z0-9_-]{4,128}$/.test(id) ? id : '';
}

function mapillaryPageUrl(id) {
  return id
    ? `https://www.mapillary.com/app/?pKey=${encodeURIComponent(id)}&focus=photo`
    : '';
}

function safeWebUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch (_) {
    return '';
  }
}

function normalizeElement(element, center = DEFAULT_CENTER) {
  const lat = Number(element.lat ?? element.center?.lat);
  const lng = Number(element.lon ?? element.center?.lon);
  const tags = element.tags || {};
  if (!tags.name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const mapillaryId = mapillaryIdFrom(tags);

  return {
    id: `osm-${element.type}-${element.id}`,
    osmId: String(element.id),
    osmType: element.type,
    name: tags.name,
    category: categoryFor(tags.amenity),
    amenity: tags.amenity || '',
    cuisine: String(tags.cuisine || '').split(';').filter(Boolean).slice(0, 4),
    openingHours: tags.opening_hours || '',
    phone: tags.phone || tags['contact:phone'] || '',
    website: safeWebUrl(tags.website || tags['contact:website']),
    address: addressFrom(tags),
    takeaway: tags.takeaway || '',
    delivery: tags.delivery || '',
    lat,
    lng,
    distanceMeters: distanceMeters(center, { lat, lng }),
    osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    mapillaryId,
    mapillaryUrl: mapillaryPageUrl(mapillaryId),
  };
}

function normalizeResponse(payload, center = DEFAULT_CENTER) {
  const seen = new Set();
  const places = (Array.isArray(payload?.elements) ? payload.elements : [])
    .map((element) => normalizeElement(element, center))
    .filter((place) => {
      if (!place) return false;
      const key = `${place.name.toLocaleLowerCase()}|${place.lat.toFixed(5)}|${place.lng.toFixed(5)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  // Keep the map responsive with the nearest results, while retaining a small
  // number of explicitly linked street photos from elsewhere in the same radius.
  const selected = places.slice(0, MAX_NEAREST_PLACES);
  const selectedIds = new Set(selected.map((place) => place.id));
  places
    .filter((place) => place.mapillaryId && !selectedIds.has(place.id))
    .slice(0, MAX_LINKED_PHOTOS)
    .forEach((place) => {
      selected.push(place);
      selectedIds.add(place.id);
    });
  return selected.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch (_) {
    return '';
  }
}

function clampMapillaryRadius(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_MAPILLARY_SEARCH_RADIUS_METERS;
  return Math.min(MAX_MAPILLARY_SEARCH_RADIUS_METERS, Math.max(20, Math.round(parsed)));
}

function bboxAround(point, radiusMeters = DEFAULT_MAPILLARY_SEARCH_RADIUS_METERS) {
  const radius = clampMapillaryRadius(radiusMeters);
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  const latDelta = radius / 111320;
  const lngDelta = radius / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta]
    .map((value) => value.toFixed(7))
    .join(',');
}

function mapillaryCoordinates(image = {}) {
  const coordinates = image.computed_geometry?.coordinates || image.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function selectNearestMapillaryImage(images, point, maxDistanceMeters = DEFAULT_MAPILLARY_SEARCH_RADIUS_METERS) {
  const maxDistance = clampMapillaryRadius(maxDistanceMeters);
  if (!Array.isArray(images) || !Number.isFinite(Number(point?.lat)) || !Number.isFinite(Number(point?.lng))) {
    return null;
  }

  return images.reduce((nearest, image) => {
    const coordinates = mapillaryCoordinates(image);
    const id = mapillaryIdFrom({ mapillary: image?.id });
    const imageUrl = safeHttpsUrl(image?.thumb_1024_url || image?.thumb_256_url);
    if (!coordinates || !id || !imageUrl) return nearest;
    const imageDistanceMeters = distanceMeters(
      { lat: Number(point.lat), lng: Number(point.lng) },
      coordinates
    );
    if (imageDistanceMeters > maxDistance || (nearest && nearest.distanceMeters <= imageDistanceMeters)) {
      return nearest;
    }
    return {
      id,
      imageUrl,
      imageSource: 'Mapillary',
      imageCapturedAt: Number(image.captured_at) || null,
      coordinates,
      distanceMeters: imageDistanceMeters,
      mapillaryUrl: mapillaryPageUrl(id),
      matchType: 'nearby',
    };
  }, null);
}

async function requestMapillaryThumbnail(id, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const fields = 'id,thumb_1024_url,thumb_256_url,captured_at';
    const endpoint = process.env.MAPILLARY_GRAPH_API_URL || MAPILLARY_GRAPH_ENDPOINT;
    const url = `${endpoint}/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `OAuth ${token}`,
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const imageUrl = safeHttpsUrl(payload.thumb_1024_url || payload.thumb_256_url);
    if (!imageUrl) return null;
    return {
      imageUrl,
      imageSource: 'Mapillary',
      imageCapturedAt: Number(payload.captured_at) || null,
    };
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getMapillaryThumbnail(id) {
  const safeId = mapillaryIdFrom({ mapillary: id });
  const token = process.env.MAPILLARY_ACCESS_TOKEN || process.env.MAPILLARY_CLIENT_TOKEN;
  if (!safeId || !token) return null;

  const now = Date.now();
  const cached = mapillaryImageCache.get(safeId);
  if (cached && now - cached.fetchedAt < DEFAULT_TTL_MS) return cached.image;

  const image = await requestMapillaryThumbnail(safeId, token);
  if (image) mapillaryImageCache.set(safeId, { image, fetchedAt: now });
  return image;
}

async function requestNearbyMapillaryImage(point, radiusMeters, token) {
  const bbox = bboxAround(point, radiusMeters);
  if (!bbox) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const fields = 'id,computed_geometry,captured_at,thumb_1024_url,thumb_256_url';
    const endpoint = process.env.MAPILLARY_GRAPH_API_URL || MAPILLARY_GRAPH_ENDPOINT;
    const query = new URLSearchParams({ fields, bbox, limit: '200' });
    const response = await fetch(`${endpoint}/images?${query}`, {
      headers: {
        Authorization: `OAuth ${token}`,
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return selectNearestMapillaryImage(payload.data, point, radiusMeters);
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getNearbyMapillaryImage(point, radiusMeters = DEFAULT_MAPILLARY_SEARCH_RADIUS_METERS) {
  const token = process.env.MAPILLARY_ACCESS_TOKEN || process.env.MAPILLARY_CLIENT_TOKEN;
  const lat = Number(point?.lat);
  const lng = Number(point?.lng);
  const radius = clampMapillaryRadius(radiusMeters);
  if (!token || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const key = `${lat.toFixed(5)}|${lng.toFixed(5)}|${radius}`;
  const now = Date.now();
  const cached = mapillaryNearbyCache.get(key);
  if (cached && now - cached.fetchedAt < DEFAULT_TTL_MS) return cached.image;

  const image = await requestNearbyMapillaryImage({ lat, lng }, radius, token);
  mapillaryNearbyCache.set(key, { image, fetchedAt: now });
  return image;
}

async function addMapillaryThumbnails(places) {
  if (!(process.env.MAPILLARY_ACCESS_TOKEN || process.env.MAPILLARY_CLIENT_TOKEN)) return places;

  const thumbnails = new Map();
  const candidates = places.filter((place) => place.mapillaryId).slice(0, 16);
  await Promise.all(candidates.map(async (place) => {
    const image = await getMapillaryThumbnail(place.mapillaryId);
    if (image) thumbnails.set(place.id, image);
  }));

  return places.map((place) => {
    const image = thumbnails.get(place.id);
    return image ? { ...place, ...image } : place;
  });
}

async function requestPlaces({ center, radiusMeters, endpoint }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      body: new URLSearchParams({ data: buildQuery(center, radiusMeters) }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Overpass responded with ${response.status}`);
    const places = normalizeResponse(await response.json(), center);
    return addMapillaryThumbnails(places);
  } finally {
    clearTimeout(timer);
  }
}

async function getNearbyPlaces(options = {}) {
  const center = {
    lat: Number(options.lat) || DEFAULT_CENTER.lat,
    lng: Number(options.lng) || DEFAULT_CENTER.lng,
  };
  const radiusMeters = clampRadius(options.radiusMeters);
  const endpoints = [...new Set([
    process.env.OVERPASS_API_URL || DEFAULT_ENDPOINT,
    ...FALLBACK_ENDPOINTS,
  ])];
  const ttlMs = Number(process.env.OVERPASS_CACHE_TTL_MS) || DEFAULT_TTL_MS;
  const key = `${center.lat}|${center.lng}|${radiusMeters}|${endpoints.join('|')}`;
  const now = Date.now();

  if (cache?.key === key && now - cache.fetchedAt < ttlMs) {
    return { places: cache.places, cached: true, stale: false, fetchedAt: cache.fetchedAt };
  }

  try {
    let places;
    let lastError;
    for (const endpoint of endpoints) {
      try {
        places = await requestPlaces({ center, radiusMeters, endpoint });
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!places) throw lastError || new Error('No Overpass endpoint was available');
    cache = { key, places, fetchedAt: now };
    return { places, cached: false, stale: false, fetchedAt: now };
  } catch (error) {
    if (cache?.key === key) {
      return { places: cache.places, cached: true, stale: true, fetchedAt: cache.fetchedAt };
    }
    throw error;
  }
}

function clearCache() {
  cache = null;
  mapillaryImageCache.clear();
  mapillaryNearbyCache.clear();
}

module.exports = {
  DEFAULT_CENTER,
  DEFAULT_RADIUS_METERS,
  DEFAULT_MAPILLARY_SEARCH_RADIUS_METERS,
  bboxAround,
  buildQuery,
  clampRadius,
  distanceMeters,
  getNearbyPlaces,
  getMapillaryThumbnail,
  getNearbyMapillaryImage,
  mapillaryIdFrom,
  normalizeElement,
  normalizeResponse,
  selectNearestMapillaryImage,
  clearCache,
};
