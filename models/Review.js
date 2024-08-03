// models/Review.js

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 0, max: 5 },
  comment: { type: String, required: true },
  establishment: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment', required: true },
  date: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  likesUserIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'User' },
  comments: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, text: String, date: { type: Date, default: Date.now } }]
}, {
  timestamps: true
});

// Middleware to update establishment's average rating after saving a review
reviewSchema.post('save', async function(doc) {
  const establishment = await mongoose.model('Establishment').findById(doc.establishment);
  if (establishment) {
    await establishment.updateAverageRating();
  }
});

// Middleware to update establishment's average rating after removing a review
reviewSchema.post('remove', async function(doc) {
  const establishment = await mongoose.model('Establishment').findById(doc.establishment);
  if (establishment) {
    await establishment.updateAverageRating();
  }
});

// Middleware to update establishment's average rating after removing a review: based on app.js
reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const establishment = await mongoose.model('Establishment').findById(doc.establishment);
    if (establishment) {
      await establishment.updateAverageRating();
    }
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;