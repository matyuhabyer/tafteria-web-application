const express = require('express');
const router = express.Router();

// Models
const Establishment = require('../models/Establishment');
const Review = require('../models/Review');

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

// Single establishment as JSON (absolute image URLs)
router.get('/api/establishments/:id', async (req, res) => {
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

// Define a route for the establishments page
router.get('/establishments', async (req, res, next) => {
  try {
    const { establishments, selectedRating, selectedCategory } = await getFilteredEstablishments(req.query);
    const geoFeatures = toGeoFeatures(establishments, req);
    const establishmentsGeoJson = JSON.stringify({
      type: 'FeatureCollection',
      features: geoFeatures,
    });
    res.render('establishments', {
      title: 'Establishments | Tafteria',
      establishments,
      establishmentsGeoJson,
      selectedRating,
      selectedCategory,
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

  try {
    let establishmentData = await Establishment.findById(id).lean();
    // Find reviews related to the specific establishment
    let reviews = await Review.find({ establishment: id })
      .populate('user')
      .populate('comments.user')
      .populate('likesUserIds')
      .lean();

    console.log('Reviews: ', reviews);
    console.log('Establishments: ', establishmentData);
    console.log('ID: ', id);
    console.log('User ID: ', userId);

    if (establishmentData) {
      let establishmentGeoJson = null;
      if (
        establishmentData.lat != null &&
        establishmentData.lng != null &&
        !Number.isNaN(Number(establishmentData.lat)) &&
        !Number.isNaN(Number(establishmentData.lng))
      ) {
        const mi = establishmentData.mainImage || '';
        establishmentGeoJson = JSON.stringify({
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
  console.log('Search Query:', query);
  const user = req.session.user;

  try {
    // Search for establishments based on exact match of the query in name or description
    const establishments = await Establishment.find({
      $or: [
        { name: { $regex: `\\b${query}\\b`, $options: 'i' } },
        { description: { $regex: `\\b${query}\\b`, $options: 'i' } },
      ],
    }).lean();
    console.log('Establishments Found:', establishments);

    // Search for reviews based on exact match of the query in comment
    const reviews = await Review.find({
      $or: [
        { comment: { $regex: `\\b${query}\\b`, $options: 'i' } },
        { 'establishment.name': { $regex: `\\b${query}\\b`, $options: 'i' } },
      ],
    })
      .populate('user')
      .populate('establishment')
      .lean();
    console.log('Reviews Found:', reviews);

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
