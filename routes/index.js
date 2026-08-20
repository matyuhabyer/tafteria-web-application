const express = require('express');
const router = express.Router();

// Models
const Establishment = require('../models/Establishment');
const Review = require('../models/Review');

// Define a route for the root path
router.get('/', async (req, res) => {
  try {
    const establishments = await Establishment.find({}).lean();
    const reviews = await Review.find({})
      .sort({ date: -1 }) // Sort reviews by date in descending order
      .populate('user', 'username avatar')
      .populate('establishment', 'name')
      .lean();

    const view = req.session.user ? 'home-user' : 'home';
    const heroCarousel = Array.isArray(establishments)
      ? establishments.slice(0, 8)
      : [];
    const featuredEstablishments = Array.isArray(establishments)
      ? establishments.slice(0, 6)
      : [];
    const recentReviews = Array.isArray(reviews) ? reviews.slice(0, 3) : [];
    res.render(view, {
      title: 'Tafteria',
      establishments,
      reviews,
      user: req.session.user,
      heroCarousel,
      featuredEstablishments,
      recentReviews,
      establishmentCount: establishments.length,
      reviewCount: reviews.length,
      layout: 'index',
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
