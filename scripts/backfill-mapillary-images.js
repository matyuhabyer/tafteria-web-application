/**
 * Find a nearby Mapillary street-level capture for OpenStreetMap places that
 * still use the placeholder image. Captures are intentionally limited to a
 * small radius and stored with explicit "nearby" provenance.
 *
 * Preview: node scripts/backfill-mapillary-images.js
 * Apply:   node scripts/backfill-mapillary-images.js --apply
 */
require('dotenv').config({ path: 'key.env' });

const mongoose = require('mongoose');
const Establishment = require('../models/Establishment');
const {
  DEFAULT_MAPILLARY_SEARCH_RADIUS_METERS,
  getNearbyMapillaryImage,
} = require('../services/openStreetMapPlaces');

const PLACEHOLDER_IMAGE = '/images/place-placeholder.svg';

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

async function main() {
  const shouldApply = process.argv.includes('--apply');
  const radius = Number(process.env.MAPILLARY_NEARBY_RADIUS_METERS)
    || DEFAULT_MAPILLARY_SEARCH_RADIUS_METERS;
  const concurrency = Math.min(8, Math.max(1, Number(process.env.MAPILLARY_BACKFILL_CONCURRENCY) || 4));
  if (!(process.env.MAPILLARY_ACCESS_TOKEN || process.env.MAPILLARY_CLIENT_TOKEN)) {
    throw new Error('MAPILLARY_ACCESS_TOKEN is missing from key.env.');
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tafteria');
  const candidates = await Establishment.find({
    source: 'openstreetmap',
    lat: { $type: 'number' },
    lng: { $type: 'number' },
    $or: [
      { mainImage: { $exists: false } },
      { mainImage: null },
      { mainImage: '' },
      { mainImage: PLACEHOLDER_IMAGE },
    ],
  }).select('_id name lat lng').lean();

  console.log(`Searching within ${radius}m for ${candidates.length} establishments (${concurrency} concurrent requests).`);
  const matches = (await mapWithConcurrency(candidates, concurrency, async (establishment, index) => {
    const image = await getNearbyMapillaryImage(establishment, radius);
    if ((index + 1) % 20 === 0 || index + 1 === candidates.length) {
      console.log(`Checked ${index + 1}/${candidates.length}.`);
    }
    return image ? { establishment, image } : null;
  })).filter(Boolean);

  const distances = matches.map(({ image }) => image.distanceMeters);
  const uniqueImages = new Set(matches.map(({ image }) => image.id));
  console.log(`Found ${matches.length} nearby captures (${uniqueImages.size} unique Mapillary images).`);
  if (distances.length) {
    console.log(`Distance: median ${percentile(distances, 0.5)}m, maximum ${Math.max(...distances)}m.`);
  }

  if (!shouldApply) {
    console.log('Dry run only. Re-run with --apply to update MongoDB.');
    return;
  }

  if (matches.length) {
    await Establishment.bulkWrite(matches.map(({ establishment, image }) => ({
      updateOne: {
        filter: { _id: establishment._id, mainImage: PLACEHOLDER_IMAGE },
        update: {
          $set: {
            mainImage: `/establishments/${establishment._id}/image`,
            mapillaryId: image.id,
            mapillaryUrl: image.mapillaryUrl,
            mapillaryMatchType: 'nearby',
            mapillaryDistanceMeters: image.distanceMeters,
          },
        },
      },
    })));
  }

  await Establishment.updateMany(
    {
      source: 'openstreetmap',
      mapillaryId: { $nin: [null, ''] },
      mapillaryMatchType: { $exists: false },
    },
    { $set: { mapillaryMatchType: 'linked', mapillaryDistanceMeters: 0 } }
  );
  console.log(`Updated ${matches.length} establishments with nearby Mapillary street views.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

