const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Models
const Review = require('../models/Review');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Handle review input
router.post('/establishments/:id/reviews', upload.array('photos', 5), async (req, res) => {
  const establishmentId = req.params.id;
  const { rating, comment } = req.body;
  const user = req.session.user;

  console.log('Review submission data:', { establishmentId, rating, comment, user: user?.id });
  console.log('Files uploaded:', req.files);

  if (!user || !user.id) {
    return res.status(401).send('You must be logged in to post a review.');
  }

  if (!rating || !comment) {
    console.error('Missing required fields:', { rating, comment });
    return res.status(400).send('Rating and comment are required.');
  }

  try {
    // Get uploaded photo filenames
    const photos = req.files ? req.files.map(file => file.filename) : [];

    const newReview = new Review({
      user: user.id,
      rating: parseInt(rating),
      comment,
      photos,
      establishment: establishmentId
    });

    console.log('Creating review:', newReview);
    await newReview.save();
    console.log('Review saved successfully');
    res.redirect(`/establishments/${establishmentId}`);
  } catch (error) {
    console.error('Error posting review:', error);
    res.status(500).send('Error posting review.');
  }
});

// Add comment to review
router.post('/reviews/:id/comments', async (req, res) => {
  const reviewId = req.params.id;
  const { text } = req.body;
  const user = req.session.user;

  if (!user || !user.id) {
    return res.status(401).send('You must be logged in to comment.');
  }

  try {
    await Review.findByIdAndUpdate(reviewId, {
      $push: { comments: { user: user.id, text } }
    });

    res.redirect(`/establishments/${req.body.establishmentId}`);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).send('Error adding comment.');
  }
});

// Delete review route
router.delete('/reviews/:id', async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.session.user.id;

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    if (review.user.toString() !== userId) {
      return res.status(403).send('Unauthorized');
    }

    await Review.findByIdAndDelete(reviewId);
    res.status(200).send('Review deleted successfully');
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).send('Error deleting review');
  }
});

// Edit review route
router.post('/reviews/:id/edit', async (req, res) => {
  const reviewId = req.params.id;
  const { comment } = req.body;
  const userId = req.session.user.id;

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    if (review.user.toString() !== userId) {
      return res.status(403).send('Unauthorized');
    }

    review.comment = comment;
    await review.save();

    res.redirect(`/establishments/${review.establishment}`);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).send('Error updating review');
  }
});

// Mark review as helpful (like)
router.post('/reviews/:id/like', async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).send('You must be logged in to like a review.');
  }

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    // Check if the user has already liked the review
    if (review.likesUserIds.includes(userId)) {
      return res.status(400).send('You have already liked this review.');
    }

    review.likesUserIds.push(userId); // Add userId to the array
    review.likes += 1; // Increment likes count
    await review.save();

    res.status(200).send('Review marked as helpful');
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    res.status(500).send('Error marking review as helpful');
  }
});

// Edit review route (profile)
router.post('/profile/reviews/:id/edit', async (req, res) => {
  const reviewId = req.params.id;
  const { comment } = req.body;
  const userId = req.session.user.id;

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    if (review.user.toString() !== userId) {
      return res.status(403).send('Unauthorized');
    }

    review.comment = comment;
    await review.save();

    res.redirect('/profile'); // Redirect back to profile
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).send('Error updating review');
  }
});

// Delete review route (profile)
router.post('/profile/reviews/:id/delete', async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.session.user.id;

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    if (review.user.toString() !== userId) {
      return res.status(403).send('Unauthorized');
    }

    await Review.findByIdAndDelete(reviewId);
    res.redirect('/profile'); // Redirect back to profile
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).send('Error deleting review');
  }
});

module.exports = router; 