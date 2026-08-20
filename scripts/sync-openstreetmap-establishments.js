/**
 * Replace the application establishment collection with nearby OpenStreetMap
 * records. Existing records are renamed to a timestamped archive collection.
 * Exact name matches keep their ObjectId so reviews remain attached.
 *
 * Preview: node scripts/sync-openstreetmap-establishments.js
 * Apply:   node scripts/sync-openstreetmap-establishments.js --replace
 */
require('dotenv').config({ path: 'key.env' });

const mongoose = require('mongoose');
const Establishment = require('../models/Establishment');
const Review = require('../models/Review');
const { getNearbyPlaces } = require('../services/openStreetMapPlaces');

const PLACEHOLDER_IMAGE = '/images/place-placeholder.svg';

function normalizedName(value) {
  return String(value || '').trim().toLocaleLowerCase();
}

function categoryFor(place) {
  return ({
    restaurant: 'Restaurant',
    cafe: 'Cafe',
    fast_food: 'Fastfood',
    food_court: 'Foodcourt',
    ice_cream: 'Dessert',
  })[place.amenity] || 'Restaurant';
}

function descriptionFor(place) {
  const category = place.category || 'Food spot';
  const cuisine = Array.isArray(place.cuisine) && place.cuisine.length
    ? ` serving ${place.cuisine.map((value) => value.replace(/_/g, ' ')).join(', ')}`
    : '';
  return `${category}${cuisine} near DLSU.`;
}

function archiveSuffix() {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

async function buildDocuments(places, existing) {
  const existingByName = new Map();
  existing.forEach((item) => {
    const key = normalizedName(item.name);
    if (!existingByName.has(key)) existingByName.set(key, item);
  });

  const reusedIds = new Set();
  const reusedNames = [];
  const now = new Date();
  const documents = places.map((place) => {
    const match = existingByName.get(normalizedName(place.name));
    const canReuse = match && !reusedIds.has(String(match._id));
    const id = canReuse ? match._id : new mongoose.Types.ObjectId();
    if (canReuse) {
      reusedIds.add(String(match._id));
      reusedNames.push(match.name);
    }

    const preservesNearbyMapillary = !place.mapillaryId
      && canReuse
      && match.mapillaryMatchType === 'nearby'
      && match.mapillaryId;
    const mapillaryId = place.mapillaryId || (preservesNearbyMapillary ? match.mapillaryId : '');
    const mapillaryUrl = place.mapillaryUrl || (preservesNearbyMapillary ? match.mapillaryUrl : '');
    const reusableLocalImage = canReuse
      && match.mainImage
      && !/^\/establishments\/[^/]+\/image$/.test(match.mainImage)
      ? match.mainImage
      : PLACEHOLDER_IMAGE;
    const preservesHumanCover = canReuse
      && ['owner', 'community'].includes(match.coverPhotoSource)
      && /^\/uploads\/[A-Za-z0-9._-]+$/.test(match.mainImage || '');
    const mainImage = preservesHumanCover
      ? match.mainImage
      : mapillaryId
      ? `/establishments/${id}/image`
      : reusableLocalImage;

    return {
      _id: id,
      name: place.name,
      mainImage,
      phone: place.phone || '',
      rating: canReuse ? Number(match.rating) || 0 : 0,
      reviewsCount: canReuse ? Number(match.reviewsCount) || 0 : 0,
      description: descriptionFor(place),
      gallery: canReuse && Array.isArray(match.gallery) ? match.gallery : [],
      category: categoryFor(place),
      lat: place.lat,
      lng: place.lng,
      source: 'openstreetmap',
      osmKey: `${place.osmType}/${place.osmId}`,
      osmId: place.osmId,
      osmType: place.osmType,
      osmUrl: place.osmUrl,
      mapillaryId,
      mapillaryUrl,
      mapillaryMatchType: place.mapillaryId ? 'linked' : (preservesNearbyMapillary ? 'nearby' : undefined),
      mapillaryDistanceMeters: place.mapillaryId
        ? 0
        : (preservesNearbyMapillary ? match.mapillaryDistanceMeters : undefined),
      ownerUser: canReuse ? match.ownerUser : undefined,
      coverPhotoSource: preservesHumanCover ? match.coverPhotoSource : undefined,
      coverPhotoCreditUser: preservesHumanCover ? match.coverPhotoCreditUser : undefined,
      coverPhotoApprovedBy: preservesHumanCover ? match.coverPhotoApprovedBy : undefined,
      coverPhotoApprovedAt: preservesHumanCover ? match.coverPhotoApprovedAt : undefined,
      approvedCoverSubmission: preservesHumanCover ? match.approvedCoverSubmission : undefined,
      address: place.address || '',
      openingHours: place.openingHours || '',
      cuisine: place.cuisine || [],
      website: place.website || '',
      takeaway: place.takeaway || '',
      delivery: place.delivery || '',
      distanceMeters: place.distanceMeters,
      dataUpdatedAt: now,
      createdAt: canReuse && match.createdAt ? match.createdAt : now,
      updatedAt: now,
    };
  });

  return { documents, reusedIds, reusedNames };
}

async function replaceCollection(documents, reusedIds) {
  const db = mongoose.connection.db;
  const suffix = archiveSuffix();
  const sourceName = Establishment.collection.collectionName;
  const archiveName = `${sourceName}_archive_${suffix}`;
  const reviewArchiveName = `reviews_archive_${suffix}`;
  const collectionExists = await db.listCollections({ name: sourceName }).hasNext();
  const orphanReviews = await Review.find({ establishment: { $nin: [...reusedIds] } }).lean();

  if (collectionExists) await db.collection(sourceName).rename(archiveName);

  try {
    await Establishment.insertMany(documents, { ordered: true });
    await Establishment.syncIndexes();

    if (orphanReviews.length) {
      await db.createCollection(reviewArchiveName);
      await db.collection(reviewArchiveName).insertMany(orphanReviews);
      await Review.deleteMany({ _id: { $in: orphanReviews.map((review) => review._id) } });
    }
  } catch (error) {
    if (await db.listCollections({ name: sourceName }).hasNext()) {
      await db.collection(sourceName).drop();
    }
    if (collectionExists) await db.collection(archiveName).rename(sourceName);
    throw error;
  }

  return { archiveName: collectionExists ? archiveName : null, reviewArchiveName: orphanReviews.length ? reviewArchiveName : null, orphanReviews: orphanReviews.length };
}

async function main() {
  const shouldReplace = process.argv.includes('--replace');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tafteria');

  const [result, existing] = await Promise.all([
    getNearbyPlaces(),
    Establishment.find({}).lean(),
  ]);
  if (result.places.length < 50) throw new Error(`Refusing to sync only ${result.places.length} places.`);

  const { documents, reusedIds, reusedNames } = await buildDocuments(result.places, existing);
  const uniqueOsmKeys = new Set(documents.map((document) => document.osmKey));
  if (uniqueOsmKeys.size !== documents.length) throw new Error('Duplicate OpenStreetMap identities detected.');

  console.log(`Prepared ${documents.length} OpenStreetMap establishments.`);
  console.log(`Preserving ${reusedIds.size} existing IDs for exact name matches.`);
  if (reusedNames.length) console.log(`Matched: ${reusedNames.join(', ')}.`);
  const orphanReviewCount = await Review.countDocuments({ establishment: { $nin: [...reusedIds] } });
  console.log(`Reviews requiring archive: ${orphanReviewCount}.`);

  if (!shouldReplace) {
    console.log('Dry run only. Re-run with --replace to update MongoDB.');
    return;
  }

  const archive = await replaceCollection(documents, reusedIds);
  console.log(`Replaced establishments with ${documents.length} OpenStreetMap records.`);
  if (archive.archiveName) console.log(`Previous collection archived as ${archive.archiveName}.`);
  if (archive.orphanReviews) console.log(`Archived ${archive.orphanReviews} unmatched reviews in ${archive.reviewArchiveName}.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
