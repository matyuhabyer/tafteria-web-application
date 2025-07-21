// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  avatar: { type: String, required: true },
  coverPhoto: { type: String },
  description: { type: String },
  favorites: { type: String },
  averageRating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  joinedDate: {type: Date, default: Date.now}
});

// Method to calculate and update the average rating
userSchema.methods.updateAverageRating = async function() {
  const reviews = await mongoose.model('Review').find({ user: this._id });
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  this.averageRating = reviews.length ? totalRating / reviews.length : 0;
  this.reviewsCount = reviews.length;
  await this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;