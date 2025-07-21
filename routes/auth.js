const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const { check, validationResult } = require('express-validator');

// Models
const User = require('../models/User');

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

// Login page route
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login | Tafteria', layout: 'index' });
});

// Register page route
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register | Tafteria', layout: 'index' });
});

// Handle user registration
router.post('/register', upload.single('avatar'), async (req, res) => {
  const { username, password, description } = req.body;
  const avatar = req.file ? req.file.filename : null;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, avatar, description });
    await newUser.save();

    // Store user data in session
    req.session.user = {
      id: newUser._id,
      username: newUser.username,
      avatar: newUser.avatar,
      description: newUser.description
    };

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error registering new user.');
  }
});

// Handle user login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).send('Invalid username or password.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send('Invalid username or password.');
    }

    // Store user data in session
    req.session.user = {
      id: user._id,
      username: user.username,
      avatar: user.avatar,
      description: user.description,
      favorites: user.favorites,
      averageRating: user.averageRating,
      reviewsCount: user.reviewsCount
    };

    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error during login.');
  }
});

// Handle user logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

// Profile page route
router.get('/profile', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    // Find the logged-in user's details
    const user = await User.findById(req.session.user.id).lean();

    // Find all reviews written by the logged-in user and populate the establishment field
    const Review = require('../models/Review');
    const reviews = await Review.find({ user: req.session.user.id }).populate('establishment').lean();

    // Calculate user's average rating if not already calculated
    const userDoc = await User.findById(req.session.user.id);
    if (userDoc) {
      await userDoc.updateAverageRating();
      // Update the user object with fresh data
      Object.assign(user, {
        averageRating: userDoc.averageRating,
        reviewsCount: userDoc.reviewsCount
      });
    }

    res.render('profile', {
      title: 'Profile | Tafteria',
      layout: 'index',
      user: user,
      reviews: reviews
    });
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).send('Error fetching profile data.');
  }
});

// Route to Handle profile edit
router.post('/profile/edit', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 }
]), [
  check('description').isLength({ max: 200 }).withMessage('Description must be less than 200 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
  }

  if (!req.session.user) {
      return res.redirect('/login');
  }

  try {
      const userId = req.session.user.id;
      const { description, favorites } = req.body;
      const avatar = req.files && req.files['avatar'] ? req.files['avatar'][0].filename : req.session.user.avatar;
      const coverPhoto = req.files && req.files['coverPhoto'] ? req.files['coverPhoto'][0].filename : req.session.user.coverPhoto;

      // Update the user profile
      await User.findByIdAndUpdate(userId, {
          avatar,
          coverPhoto,
          description,
          favorites
      });

      // Update session data
      req.session.user.avatar = avatar;
      req.session.user.coverPhoto = coverPhoto;
      req.session.user.description = description;
      req.session.user.favorites = favorites;

      res.redirect('/profile');
  } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).send('Error updating profile.');
  }
});

module.exports = router; 