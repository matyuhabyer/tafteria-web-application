// models/Establishment.js
const mongoose = require('mongoose');

const establishmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mainImage: { type: String, required: true },
  phone: { type: String },
  rating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  description: { type: String },
  gallery: [{ type: String }]  // for the page

},{ timestamps: true });

// Method to calculate and update the average rating
establishmentSchema.methods.updateAverageRating = async function() {
  const reviews = await mongoose.model('Review').find({ establishment: this._id });
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating = reviews.length ? totalRating / reviews.length : 0;
  this.reviewsCount = reviews.length;
  await this.save();
};



const Establishment = mongoose.model('Establishment', establishmentSchema);

module.exports = Establishment;
