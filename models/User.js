// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  avatar: { type: String, required: true },
  description: { type: String },
  joinedDate: {type: Date, default: Date.now}
});

const User = mongoose.model('User', userSchema);

module.exports = User;