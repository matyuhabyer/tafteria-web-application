const express = require('express');
const router = express.Router();

// Models
const Establishment = require('../models/Establishment');
const Review = require('../models/Review');

// Define a route for the establishments page
router.get('/establishments', async (req, res, next) => {
  let establishments = await Establishment.find({}).lean();
  res.render('establishments', { title: 'Establishments | Tafteria', establishments: establishments, layout: 'index', user: req.session.user });
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
    
    console.log("Reviews: ", reviews);
    console.log("Establishments: ", establishmentData);
    console.log("ID: ", id);
    console.log("User ID: ", userId);

    if (establishmentData) {
      res.render('pages', {
        title: 'Tafteria',
        establishmentData: establishmentData,
        reviews: reviews,
        user: req.session.user,
        layout: 'index'
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
        { description: { $regex: `\\b${query}\\b`, $options: 'i' } }
      ]
    }).lean();
    console.log('Establishments Found:', establishments);

    // Search for reviews based on exact match of the query in comment
    const reviews = await Review.find({
      $or: [
        { comment: { $regex: `\\b${query}\\b`, $options: 'i' } },
        { 'establishment.name': { $regex: `\\b${query}\\b`, $options: 'i' } }
      ]
    }).populate('user').populate('establishment').lean();
    console.log('Reviews Found:', reviews);

    // Render the search results page with the query, establishments, and reviews
    res.render('search', {
      title: 'Search Results | Tafteria',
      user,
      query,
      establishments,
      reviews
    });
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).send('Error performing search.');
  }
});

module.exports = router; 