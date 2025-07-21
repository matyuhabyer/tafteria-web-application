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
      .populate('user')
      .populate('establishment')
      .lean();

    res.render('home', { title: 'Tafteria', establishments, reviews, user: req.session.user, layout: 'index' });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router; 