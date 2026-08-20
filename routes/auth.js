const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const { check, validationResult } = require('express-validator');
const crypto = require('crypto');

// Models
const User = require('../models/User');
const Establishment = require('../models/Establishment');

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
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: function (req, file, cb) {
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'));
    }
    cb(null, true);
  },
});

function requireUser(req, res, next) {
  if (!req.session.user?.id) return res.redirect('/login');
  next();
}

// Login page route
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login | Tafteria', layout: 'index' });
});

// Register page route
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register | Tafteria', layout: 'index' });
});

// Handle user registration
router.post('/register', upload.single('avatar'), [
  check('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters.'),
  check('password').isLength({ min: 8, max: 72 }).withMessage('Password must be between 8 and 72 characters.'),
  check('description').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).withMessage('Description must be 200 characters or fewer.'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('register', {
      title: 'Register | Tafteria',
      layout: 'index',
      errors: errors.array(),
      form: { username: req.body.username, description: req.body.description },
    });
  }

  const username = String(req.body.username || '').trim();
  const { password, description } = req.body;
  const avatar = req.file ? req.file.filename : null;

  try {
    if (!avatar) {
      return res.status(400).render('register', {
        title: 'Register | Tafteria', layout: 'index', errors: [{ msg: 'Please choose a profile photo.' }],
        form: { username, description },
      });
    }
    if (await User.exists({ username: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })) {
      return res.status(409).render('register', {
        title: 'Register | Tafteria', layout: 'index', errors: [{ msg: 'That username is already taken.' }],
        form: { username, description },
      });
    }
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
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  try {
    const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne({ username: new RegExp(`^${escapedUsername}$`, 'i') });
    if (!user) {
      return res.status(401).render('login', { title: 'Login | Tafteria', layout: 'index', error: 'Invalid username or password.', form: { username } });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).render('login', { title: 'Login | Tafteria', layout: 'index', error: 'Invalid username or password.', form: { username } });
    }

    // Store user data in session
    req.session.user = {
      id: user._id,
      username: user.username,
      avatar: user.avatar,
      description: user.description,
      averageRating: user.averageRating,
      reviewsCount: user.reviewsCount
    };
    req.session.cookie.maxAge = req.body.remember
      ? 1000 * 60 * 60 * 24 * 30
      : 1000 * 60 * 60 * 24;

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
    const user = await User.findById(req.session.user.id)
      .populate('favoriteEstablishments')
      .lean();

    // Find all reviews written by the logged-in user and populate the establishment field
    const Review = require('../models/Review');
    const [reviews, reviewEstablishments] = await Promise.all([
      Review.find({ user: req.session.user.id }).populate('establishment').lean(),
      Establishment.find({}).select('_id name category rating mainImage').sort({ name: 1 }).lean(),
    ]);

    const photoCount = reviews.reduce(
      (n, r) => n + (Array.isArray(r.photos) ? r.photos.length : 0),
      0
    );

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

    const joinedDate = user.joinedDate ? new Date(user.joinedDate) : null;
    user.joinedDateFormatted = joinedDate && !Number.isNaN(joinedDate.getTime())
      ? joinedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : '';

    res.render('profile', {
      title: 'Profile | Tafteria',
      layout: 'index',
      user: user,
      reviews: reviews,
      photoCount: photoCount,
      favoriteEstablishments: (user.favoriteEstablishments || []).filter(Boolean),
      favoriteCount: (user.favoriteEstablishments || []).filter(Boolean).length,
      reviewEstablishments,
      reviewSubmitted: req.query.review === 'submitted',
    });
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).send('Error fetching profile data.');
  }
});

// Route to Handle profile edit
router.post('/profile/edit', requireUser, upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 }
]), [
  check('description').isLength({ max: 200 }).withMessage('Description must be less than 200 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
  }

  try {
      const userId = req.session.user.id;
      const { description } = req.body;
      const avatar = req.files && req.files['avatar'] ? req.files['avatar'][0].filename : req.session.user.avatar;
      const coverPhoto = req.files && req.files['coverPhoto'] ? req.files['coverPhoto'][0].filename : req.session.user.coverPhoto;

      // Update the user profile
      await User.findByIdAndUpdate(userId, {
          avatar,
          coverPhoto,
          description
      });

      // Update session data
      req.session.user.avatar = avatar;
      req.session.user.coverPhoto = coverPhoto;
      req.session.user.description = description;

      res.redirect('/profile');
  } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).send('Error updating profile.');
  }
});

module.exports = router;
