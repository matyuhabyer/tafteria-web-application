// models/Establishment.js
const mongoose = require('mongoose');

const establishmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mainImage: { type: String, default: '/images/place-placeholder.svg' },
  phone: { type: String },
  rating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  description: { type: String },
  gallery: [{ type: String }],  // for the page
  category: { type: String, enum: ['Stall', 'Cafe', 'Restaurant', 'Fastfood', 'Foodcourt', 'Dessert'], required: false },
  /** WGS84 coordinates for maps (Taft / Manila area) */
  lat: { type: Number },
  lng: { type: Number },
  source: { type: String, enum: ['tafteria', 'openstreetmap'], default: 'tafteria', index: true },
  osmKey: { type: String, unique: true, sparse: true, index: true },
  osmId: { type: String },
  osmType: { type: String, enum: ['node', 'way', 'relation'] },
  osmUrl: { type: String },
  mapillaryId: { type: String },
  mapillaryUrl: { type: String },
  mapillaryMatchType: { type: String, enum: ['linked', 'nearby'] },
  mapillaryDistanceMeters: { type: Number },
  ownerUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  coverPhotoSource: { type: String, enum: ['owner', 'community'] },
  coverPhotoCreditUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  coverPhotoApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  coverPhotoApprovedAt: { type: Date },
  approvedCoverSubmission: { type: mongoose.Schema.Types.ObjectId, ref: 'CoverPhotoSubmission' },
  address: { type: String },
  openingHours: { type: String },
  cuisine: [{ type: String }],
  website: { type: String },
  takeaway: { type: String },
  delivery: { type: String },
  distanceMeters: { type: Number },
  dataUpdatedAt: { type: Date },
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
