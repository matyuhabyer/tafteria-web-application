const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');

// Models
const Establishment = require('../models/Establishment');
const Review = require('../models/Review');
const User = require('../models/User');
const CoverPhotoSubmission = require('../models/CoverPhotoSubmission');
const { escapeRegex, safeJson, stripSourceBoilerplate } = require('../utils/text');
const {
  canManageCoverPhotos,
  isEstablishmentOwner,
} = require('../utils/coverPhotos');
const {
  DEFAULT_CENTER,
  DEFAULT_RADIUS_METERS,
  getMapillaryThumbnail,
  getNearbyPlaces,
} = require('../services/openStreetMapPlaces');

const coverPhotoStorage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, path.join(__dirname, '..', 'public', 'uploads'));
  },
  filename(req, file, callback) {
    callback(null, `cover-${Date.now()}-${crypto.randomBytes(10).toString('hex')}${path.extname(file.originalname).toLowerCase()}`);
  },
});
const coverPhotoUpload = multer({
  storage: coverPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    const allowedMime = /^image\/(jpeg|png|webp)$/i.test(file.mimetype);
    const allowedExtension = /^\.(jpe?g|png|webp)$/i.test(path.extname(file.originalname));
    if (!allowedMime || !allowedExtension) {
      return callback(new Error('Only JPEG, PNG, and WebP cover photos are allowed.'));
    }
    callback(null, true);
  },
});

function requireUser(req, res, next) {
  if (!req.session.user?.id) return res.redirect('/login');
  next();
}

function requireValidEstablishmentId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).send('Invalid establishment.');
  next();
}

async function discardUploadedCover(file) {
  if (!file?.filename) return;
  const uploadDirectory = path.resolve(__dirname, '..', 'public', 'uploads');
  const target = path.resolve(uploadDirectory, path.basename(file.filename));
  if (!target.startsWith(`${uploadDirectory}${path.sep}`)) return;
  await fs.unlink(target).catch(() => {});
}

function coverPhotoNotice(value) {
  return ({
    submitted: 'Your cover photo was submitted for review.',
    published: 'The owner-approved cover photo is now live.',
    approved: 'The community cover photo is now live.',
    rejected: 'The cover photo submission was declined.',
    duplicate: 'You already have a cover photo awaiting review for this place.',
  })[value] || '';
}

/** Turn stored paths (/images/..., /uploads/...) into absolute URLs for API clients. */
function absolutePublicUrl(req, path) {
  if (!path || typeof path !== 'string') return '';
  const trimmed = path.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!req) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
  const base = `${req.protocol}://${req.get('host')}`;
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return base + normalized;
}

/**
 * Apply category + minimum rating filters (rating filter is in-memory because it is "X and up").
 */
async function getFilteredEstablishments(query) {
  const selectedRating = query.rating || 'all';
  const selectedCategory = query.category || 'all';
  const mongoQuery = {};
  if (selectedCategory !== 'all') {
    mongoQuery.category = selectedCategory;
  }
  let establishments = await Establishment.find(mongoQuery).lean();
  if (selectedRating !== 'all') {
    const min = parseFloat(selectedRating);
    establishments = establishments.filter((e) => e.rating >= min);
  }
  return { establishments, selectedRating, selectedCategory };
}

async function getFavoriteEstablishmentIds(userId) {
  if (!userId) return new Set();
  const user = await User.findById(userId).select('favoriteEstablishments').lean();
  return new Set((user?.favoriteEstablishments || []).map((id) => String(id)));
}

function toGeoFeatures(establishments, req) {
  return establishments
    .filter(
      (e) =>
        e.lat != null &&
        e.lng != null &&
        !Number.isNaN(Number(e.lat)) &&
        !Number.isNaN(Number(e.lng))
    )
    .map((e) => {
      const mainImage = e.mainImage || '';
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(e.lng), Number(e.lat)],
        },
        properties: {
          id: String(e._id),
          name: e.name,
          rating: e.rating,
          category: e.category || '',
          description: e.description || '',
          mainImage,
          mainImageUrl: absolutePublicUrl(req, mainImage),
          mapillaryMatchType: e.mapillaryMatchType || '',
          mapillaryDistanceMeters: e.mapillaryDistanceMeters,
          coverPhotoSource: e.coverPhotoSource || '',
          url: `/establishments/${e._id}`,
        },
      };
    });
}

// JSON list (filters match /establishments) — includes resolved image URLs for clients
router.get('/api/establishments', async (req, res) => {
  try {
    const { establishments } = await getFilteredEstablishments(req.query);
    const list = establishments.map((e) => {
      const mainImage = e.mainImage || '';
      const gallery = Array.isArray(e.gallery) ? e.gallery : [];
      return {
        id: String(e._id),
        name: e.name,
        description: e.description || '',
        phone: e.phone || '',
        rating: e.rating,
        reviewsCount: e.reviewsCount,
        category: e.category || '',
        lat: e.lat,
        lng: e.lng,
        mainImage,
        mainImageUrl: absolutePublicUrl(req, mainImage),
        mapillaryMatchType: e.mapillaryMatchType || '',
        mapillaryDistanceMeters: e.mapillaryDistanceMeters,
        coverPhotoSource: e.coverPhotoSource || '',
        gallery: gallery.map((g) => ({
          path: g,
          url: absolutePublicUrl(req, g),
        })),
        url: `/establishments/${e._id}`,
      };
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load establishments' });
  }
});

// GeoJSON for Leaflet / clients (same filters as /establishments page)
router.get('/api/establishments/geo', async (req, res) => {
  try {
    const { establishments } = await getFilteredEstablishments(req.query);
    const features = toGeoFeatures(establishments, req);
    res.json({
      type: 'FeatureCollection',
      features,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load establishment locations' });
  }
});

// Resolve a current Mapillary thumbnail without exposing the client token or
// persisting an expiring CDN URL in MongoDB.
router.get('/establishments/:id/image', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.redirect(302, '/images/place-placeholder.svg');
  }
  try {
    const establishment = await Establishment.findById(req.params.id).select('mapillaryId').lean();
    const image = establishment?.mapillaryId
      ? await getMapillaryThumbnail(establishment.mapillaryId)
      : null;
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res.redirect(302, image?.imageUrl || '/images/place-placeholder.svg');
  } catch (_) {
    return res.redirect(302, '/images/place-placeholder.svg');
  }
});

// Community photos remain pending until an assigned establishment owner or a
// configured cover-photo moderator approves them. Owner uploads publish
// immediately while retaining submission and attribution records.
router.post(
  '/establishments/:id/cover-photo',
  requireUser,
  requireValidEstablishmentId,
  coverPhotoUpload.single('coverPhoto'),
  async (req, res, next) => {
    const note = String(req.body.note || '').trim();
    if (!req.file) return res.status(400).send('Choose a cover photo to upload.');
    if (note.length > 240) {
      await discardUploadedCover(req.file);
      return res.status(400).send('Cover photo notes must be 240 characters or fewer.');
    }

    let submission;
    try {
      const establishment = await Establishment.findById(req.params.id).lean();
      if (!establishment) {
        await discardUploadedCover(req.file);
        return res.status(404).send('Establishment not found.');
      }
      const existingPending = await CoverPhotoSubmission.exists({
        establishment: establishment._id,
        submittedBy: req.session.user.id,
        status: 'pending',
      });
      if (existingPending) {
        await discardUploadedCover(req.file);
        return res.redirect(`/establishments/${establishment._id}?coverPhoto=duplicate`);
      }

      const canManage = canManageCoverPhotos(req.session.user, establishment);
      const now = new Date();
      submission = await CoverPhotoSubmission.create({
        establishment: establishment._id,
        submittedBy: req.session.user.id,
        filename: req.file.filename,
        note,
        status: canManage ? 'approved' : 'pending',
        reviewedBy: canManage ? req.session.user.id : undefined,
        reviewedAt: canManage ? now : undefined,
      });

      if (canManage) {
        await CoverPhotoSubmission.updateMany(
          { establishment: establishment._id, status: 'approved', _id: { $ne: submission._id } },
          { $set: { status: 'superseded' } }
        );
        await Establishment.findByIdAndUpdate(establishment._id, {
          $set: {
            mainImage: `/uploads/${req.file.filename}`,
            coverPhotoSource: isEstablishmentOwner(req.session.user, establishment) ? 'owner' : 'community',
            coverPhotoCreditUser: req.session.user.id,
            coverPhotoApprovedBy: req.session.user.id,
            coverPhotoApprovedAt: now,
            approvedCoverSubmission: submission._id,
          },
        });
      }

      return res.redirect(`/establishments/${establishment._id}?coverPhoto=${canManage ? 'published' : 'submitted'}`);
    } catch (error) {
      if (!submission) await discardUploadedCover(req.file);
      return next(error);
    }
  }
);

router.post(
  '/establishments/:id/cover-photo-submissions/:submissionId/approve',
  requireUser,
  requireValidEstablishmentId,
  async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.submissionId)) return res.status(400).send('Invalid submission.');
    try {
      const establishment = await Establishment.findById(req.params.id).lean();
      if (!establishment) return res.status(404).send('Establishment not found.');
      if (!canManageCoverPhotos(req.session.user, establishment)) return res.status(403).send('Not authorized.');

      const submission = await CoverPhotoSubmission.findOne({
        _id: req.params.submissionId,
        establishment: establishment._id,
        status: 'pending',
      }).lean();
      if (!submission) return res.status(404).send('Pending submission not found.');

      const now = new Date();
      await CoverPhotoSubmission.updateMany(
        { establishment: establishment._id, status: 'approved' },
        { $set: { status: 'superseded' } }
      );
      await CoverPhotoSubmission.findByIdAndUpdate(submission._id, {
        $set: { status: 'approved', reviewedBy: req.session.user.id, reviewedAt: now },
      });
      await Establishment.findByIdAndUpdate(establishment._id, {
        $set: {
          mainImage: `/uploads/${submission.filename}`,
          coverPhotoSource: String(submission.submittedBy) === String(establishment.ownerUser) ? 'owner' : 'community',
          coverPhotoCreditUser: submission.submittedBy,
          coverPhotoApprovedBy: req.session.user.id,
          coverPhotoApprovedAt: now,
          approvedCoverSubmission: submission._id,
        },
      });
      return res.redirect(`/establishments/${establishment._id}?coverPhoto=approved`);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/establishments/:id/cover-photo-submissions/:submissionId/reject',
  requireUser,
  requireValidEstablishmentId,
  async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.submissionId)) return res.status(400).send('Invalid submission.');
    try {
      const establishment = await Establishment.findById(req.params.id).lean();
      if (!establishment) return res.status(404).send('Establishment not found.');
      if (!canManageCoverPhotos(req.session.user, establishment)) return res.status(403).send('Not authorized.');

      const submission = await CoverPhotoSubmission.findOneAndUpdate(
        { _id: req.params.submissionId, establishment: establishment._id, status: 'pending' },
        { $set: { status: 'rejected', reviewedBy: req.session.user.id, reviewedAt: new Date() } },
        { new: true }
      ).lean();
      if (!submission) return res.status(404).send('Pending submission not found.');
      await discardUploadedCover({ filename: submission.filename });
      return res.redirect(`/establishments/${establishment._id}?coverPhoto=rejected`);
    } catch (error) {
      return next(error);
    }
  }
);

// Nearby food venues from OpenStreetMap via Overpass. Retained as a sync/debug API;
// the primary application collection is populated from this same source.
router.get('/api/discover/nearby', async (req, res) => {
  try {
    const radiusMeters = req.query.radius || DEFAULT_RADIUS_METERS;
    const result = await getNearbyPlaces({ radiusMeters });
    const existingNames = new Set(
      (await Establishment.distinct('name')).map((name) => String(name).trim().toLocaleLowerCase())
    );
    const places = result.places.filter(
      (place) => !existingNames.has(String(place.name).trim().toLocaleLowerCase())
    );
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    res.json({
      source: 'OpenStreetMap',
      attribution: '© OpenStreetMap contributors',
      attributionUrl: 'https://www.openstreetmap.org/copyright',
      center: DEFAULT_CENTER,
      radiusMeters: Math.min(2500, Math.max(300, Number(radiusMeters) || DEFAULT_RADIUS_METERS)),
      ...result,
      places,
    });
  } catch (error) {
    console.error('OpenStreetMap discovery error:', error.message);
    res.status(503).json({
      error: 'Nearby OpenStreetMap places are temporarily unavailable.',
      source: 'OpenStreetMap',
    });
  }
});

// Single establishment as JSON (absolute image URLs)
router.get('/api/establishments/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid establishment id' });
  }
  try {
    const e = await Establishment.findById(req.params.id).lean();
    if (!e) {
      return res.status(404).json({ error: 'Establishment not found' });
    }
    const mainImage = e.mainImage || '';
    const gallery = Array.isArray(e.gallery) ? e.gallery : [];
    res.json({
      id: String(e._id),
      name: e.name,
      description: e.description || '',
      phone: e.phone || '',
      rating: e.rating,
      reviewsCount: e.reviewsCount,
      category: e.category || '',
      lat: e.lat,
      lng: e.lng,
      mainImage,
      mainImageUrl: absolutePublicUrl(req, mainImage),
      mapillaryMatchType: e.mapillaryMatchType || '',
      mapillaryDistanceMeters: e.mapillaryDistanceMeters,
      coverPhotoSource: e.coverPhotoSource || '',
      gallery: gallery.map((g) => ({
        path: g,
        url: absolutePublicUrl(req, g),
      })),
      url: `/establishments/${e._id}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load establishment' });
  }
});

// Save or remove a place from the signed-in user's favorites.
router.post('/api/establishments/:id/favorite', async (req, res) => {
  if (!req.session.user?.id) {
    return res.status(401).json({ error: 'Sign in to save favorite places.', loginUrl: '/login' });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid establishment id.' });
  }

  try {
    const establishmentExists = await Establishment.exists({ _id: req.params.id });
    if (!establishmentExists) {
      return res.status(404).json({ error: 'Establishment not found.' });
    }

    const user = await User.findById(req.session.user.id).select('favoriteEstablishments');
    if (!user) {
      return res.status(401).json({ error: 'Your session has expired.', loginUrl: '/login' });
    }

    const favorited = user.favoriteEstablishments.some((id) => String(id) === req.params.id);
    if (favorited) {
      user.favoriteEstablishments.pull(req.params.id);
    } else {
      user.favoriteEstablishments.addToSet(req.params.id);
    }
    await user.save();

    return res.json({
      favorited: !favorited,
      favoriteCount: user.favoriteEstablishments.length,
    });
  } catch (err) {
    console.error('Favorite establishment error:', err);
    return res.status(500).json({ error: 'Could not update favorites.' });
  }
});

// Define a route for the establishments page
router.get('/establishments', async (req, res, next) => {
  try {
    const { establishments, selectedRating, selectedCategory } = await getFilteredEstablishments(req.query);
    const favoriteIds = await getFavoriteEstablishmentIds(req.session.user?.id);
    establishments.forEach((establishment) => {
      establishment.isFavorite = favoriteIds.has(String(establishment._id));
    });
    const geoFeatures = toGeoFeatures(establishments, req);
    const establishmentsGeoJson = safeJson({
      type: 'FeatureCollection',
      features: geoFeatures,
    });
    res.render('establishments', {
      title: 'Establishments | Tafteria',
      establishments,
      establishmentsGeoJson,
      selectedRating,
      selectedCategory,
      resultCount: establishments.length,
      layout: 'index',
      user: req.session.user,
    });
  } catch (err) {
    next(err);
  }
});

// Handle establishments: render to pages
router.get('/establishments/:id', async (req, res) => {
  const id = req.params.id;
  const userId = req.session.user?.id;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).send('Establishment not found');
  }

  try {
    let establishmentData = await Establishment.findById(id)
      .populate('coverPhotoCreditUser', 'username')
      .lean();
    // Find reviews related to the specific establishment
    let reviews = await Review.find({ establishment: id })
      .sort({ date: -1 })
      .populate('user', 'username avatar')
      .populate('comments.user', 'username avatar')
      .lean();

    if (establishmentData) {
      establishmentData.description = stripSourceBoilerplate(establishmentData.description);
      const favoriteIds = await getFavoriteEstablishmentIds(userId);
      establishmentData.isFavorite = favoriteIds.has(String(establishmentData._id));
      const canManageCoverPhoto = canManageCoverPhotos(req.session.user, establishmentData);
      const [currentUserCoverSubmission, pendingCoverSubmissions] = await Promise.all([
        userId
          ? CoverPhotoSubmission.findOne({ establishment: id, submittedBy: userId, status: 'pending' })
            .sort({ createdAt: -1 })
            .lean()
          : null,
        canManageCoverPhoto
          ? CoverPhotoSubmission.find({ establishment: id, status: 'pending' })
            .sort({ createdAt: 1 })
            .populate('submittedBy', 'username avatar')
            .lean()
          : [],
      ]);
      const totalReviews = reviews.length;
      const ratingBreakdown = [5, 4, 3, 2, 1].map((rating) => {
        const count = reviews.filter((review) => Number(review.rating) === rating).length;
        return { rating, count, percent: totalReviews ? Math.round((count / totalReviews) * 100) : 0 };
      });
      let establishmentGeoJson = null;
      if (
        establishmentData.lat != null &&
        establishmentData.lng != null &&
        !Number.isNaN(Number(establishmentData.lat)) &&
        !Number.isNaN(Number(establishmentData.lng))
      ) {
        const mi = establishmentData.mainImage || '';
        establishmentGeoJson = safeJson({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [Number(establishmentData.lng), Number(establishmentData.lat)],
          },
          properties: {
            id: String(establishmentData._id),
            name: establishmentData.name,
            rating: establishmentData.rating,
            category: establishmentData.category || '',
            mainImage: mi,
            mainImageUrl: absolutePublicUrl(req, mi),
          },
        });
      }

      res.render('pages', {
        title: `${establishmentData.name} · Tafteria`,
        establishmentData: establishmentData,
        establishmentGeoJson,
        reviews: reviews,
        ratingBreakdown,
        canManageCoverPhoto,
        currentUserCoverSubmission,
        pendingCoverSubmissions,
        coverPhotoNotice: coverPhotoNotice(req.query.coverPhoto),
        user: req.session.user,
        layout: 'index',
      });
    } else {
      res.status(404).send('Establishment not found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving establishment');
  }
});

// Define a route for search results
router.get('/search', async (req, res) => {
  // Extract the query parameter and trim it for case-insensitive search
  const query = req.query.q ? req.query.q.trim() : '';
  const user = req.session.user;

  try {
    const escapedQuery = escapeRegex(query);
    const textMatch = query
      ? { $regex: escapedQuery, $options: 'i' }
      : { $regex: '', $options: 'i' };
    const establishments = await Establishment.find({
      $or: [{ name: textMatch }, { description: textMatch }],
    }).limit(24).lean();

    const matchingEstablishmentIds = establishments.map((item) => item._id);
    const reviewFilter = query
      ? { $or: [{ comment: textMatch }, { establishment: { $in: matchingEstablishmentIds } }] }
      : {};
    const reviews = await Review.find(reviewFilter)
      .sort({ date: -1 })
      .limit(24)
      .populate('user', 'username avatar')
      .populate('establishment', 'name')
      .lean();

    // Render the search results page with the query, establishments, and reviews
    res.render('search', {
      title: 'Search Results | Tafteria',
      user,
      query,
      establishments,
      reviews,
    });
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).send('Error performing search.');
  }
});

module.exports = router;
