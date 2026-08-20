const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Models
const Review = require('../models/Review');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: function (req, file, cb) {
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'));
    }
    cb(null, true);
  },
});

function requireUser(req, res, next) {
  if (!req.session.user?.id) {
    return res.status(401).send('You must be logged in to continue.');
  }
  next();
}

function validId(value) {
  return mongoose.isValidObjectId(value);
}

// Handle review input
router.post('/establishments/:id/reviews', requireUser, upload.array('photos', 5), async (req, res) => {
  const establishmentId = req.params.id;
  const { rating, comment } = req.body;
  const user = req.session.user;

  if (!validId(establishmentId)) {
    return res.status(400).send('Invalid establishment.');
  }
  const parsedRating = Number(rating);
  const cleanComment = String(comment || '').trim();
  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5 || !cleanComment) {
    return res.status(400).send('Rating and comment are required.');
  }
  if (cleanComment.length > 2000) {
    return res.status(400).send('Review comments must be 2,000 characters or fewer.');
  }

  try {
    // Get uploaded photo filenames
    const photos = req.files ? req.files.map(file => file.filename) : [];

    const newReview = new Review({
      user: user.id,
      rating: parsedRating,
      comment: cleanComment,
      photos,
      establishment: establishmentId
    });

    await newReview.save();
    const redirectTarget = req.body.returnTo === 'profile'
      ? '/profile?review=submitted'
      : `/establishments/${establishmentId}`;
    res.redirect(redirectTarget);
  } catch (error) {
    console.error('Error posting review:', error);
    res.status(500).send('Error posting review.');
  }
});

// Add comment to review
router.post('/reviews/:id/comments', requireUser, async (req, res) => {
  const reviewId = req.params.id;
  const { text } = req.body;
  const user = req.session.user;
  const cleanText = String(text || '').trim();
  if (!validId(reviewId)) return res.status(400).send('Invalid review.');
  if (!cleanText || cleanText.length > 1000) {
    return res.status(400).send('Comments must be between 1 and 1,000 characters.');
  }

  try {
    await Review.findByIdAndUpdate(reviewId, {
      $push: { comments: { user: user.id, text: cleanText } }
    });

    res.redirect(`/establishments/${req.body.establishmentId}`);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).send('Error adding comment.');
  }
});

// Delete review route
router.delete('/reviews/:id', requireUser, async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.session.user.id;
  if (!validId(reviewId)) return res.status(400).send('Invalid review.');

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    if (String(review.user) !== String(userId)) {
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
router.post('/reviews/:id/edit', requireUser, async (req, res) => {
  const reviewId = req.params.id;
  const { comment } = req.body;
  const userId = req.session.user.id;
  const cleanComment = String(comment || '').trim();
  if (!validId(reviewId)) return res.status(400).send('Invalid review.');
  if (!cleanComment || cleanComment.length > 2000) {
    return res.status(400).send('Review comments must be between 1 and 2,000 characters.');
  }

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    if (String(review.user) !== String(userId)) {
      return res.status(403).send('Unauthorized');
    }

    review.comment = cleanComment;
    await review.save();

    res.redirect(`/establishments/${review.establishment}`);
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).send('Error updating review');
  }
});

// Mark review as helpful (like)
router.post('/reviews/:id/like', requireUser, async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.session.user?.id;

  if (!validId(reviewId)) return res.status(400).send('Invalid review.');

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    // Check if the user has already liked the review
    if (review.likesUserIds.some((id) => String(id) === String(userId))) {
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
router.post('/profile/reviews/:id/edit', requireUser, async (req, res) => {
  const reviewId = req.params.id;
  const { comment } = req.body;
  const userId = req.session.user.id;
  const cleanComment = String(comment || '').trim();
  if (!validId(reviewId)) return res.status(400).send('Invalid review.');
  if (!cleanComment || cleanComment.length > 2000) {
    return res.status(400).send('Review comments must be between 1 and 2,000 characters.');
  }

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    if (String(review.user) !== String(userId)) {
      return res.status(403).send('Unauthorized');
    }

    review.comment = cleanComment;
    await review.save();

    res.redirect('/profile'); // Redirect back to profile
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).send('Error updating review');
  }
});

// Delete review route (profile)
router.post('/profile/reviews/:id/delete', requireUser, async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.session.user.id;
  if (!validId(reviewId)) return res.status(400).send('Invalid review.');

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    if (String(review.user) !== String(userId)) {
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
