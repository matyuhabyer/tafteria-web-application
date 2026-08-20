// models/Review.js

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true, maxlength: 2000 },
  establishment: { type: mongoose.Schema.Types.ObjectId, ref: 'Establishment', required: true },
  photos: [{ type: String }], // Array of photo filenames
  date: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  likesUserIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'User' },
  comments: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, text: { type: String, trim: true, maxlength: 1000 }, date: { type: Date, default: Date.now } }]
}, {
  timestamps: true
});

// Middleware to update establishment's average rating after saving a review
reviewSchema.post('save', async function(doc) {
  const establishment = await mongoose.model('Establishment').findById(doc.establishment);
  if (establishment) {
    await establishment.updateAverageRating();
  }
  
  // Update user's average rating
  const user = await mongoose.model('User').findById(doc.user);
  if (user) {
    await user.updateAverageRating();
  }
});

// Middleware to update establishment's average rating after removing a review
reviewSchema.post('remove', async function(doc) {
  const establishment = await mongoose.model('Establishment').findById(doc.establishment);
  if (establishment) {
    await establishment.updateAverageRating();
  }
  
  // Update user's average rating
  const user = await mongoose.model('User').findById(doc.user);
  if (user) {
    await user.updateAverageRating();
  }
});

// Middleware to update establishment's average rating after removing a review: based on app.js
reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const establishment = await mongoose.model('Establishment').findById(doc.establishment);
    if (establishment) {
      await establishment.updateAverageRating();
    }
    
    // Update user's average rating
    const user = await mongoose.model('User').findById(doc.user);
    if (user) {
      await user.updateAverageRating();
    }
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
