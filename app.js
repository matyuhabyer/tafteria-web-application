// Import and configure dotenv
require('dotenv').config({ path: 'key.env' });

const express = require('express');
const app = express();
const path = require('path');
const handlebars = require('express-handlebars');
const mongoose = require('mongoose');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const { check, validationResult } = require('express-validator');

// Models
const User = require('./models/User');
const Establishment = require('./models/Establishment');
const Reviews = require('./models/Review');

// Middleware for parsing JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration
app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Set up Handlebars as the view engine
app.engine('hbs', handlebars.engine({
  extname: 'hbs',
  defaultLayout: 'index',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    repeat: function (n, block) {
      let accum = '';
      for (let i = 0; i < n; ++i) {
        accum += block.fn(i < n);
      }
      return accum;
    },
    jsonify: function (context) {
      return JSON.stringify(context);
    },
    range: function (n) {
      return Array.from({ length: n }, (_, i) => i);
    },
    gt: function (a, b) {
      return a > b;
    },
    eq: function (a, b) {
      return a === b;
    },
    times: function (n, block) {
      let accum = '';
      for (let i = 0; i < n; ++i) {
        accum += block.fn(i);
      }
      return accum;
    },
    sub: function (a, b) {
      return a - b;
    }
  }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Set up MongoDB connection
mongoose.connect('mongodb://localhost:27017/tafteria')
  .then(() => console.log("Connected to MongoDB."))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

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

// Define a route for the root path
app.get('/', async (req, res) => {
  try {
    const establishments = await Establishment.find({}).lean();
    const reviews = await Reviews.find({})
      .sort({ date: -1 }) // Sort reviews by date in descending order
      .populate('user')
      .populate('establishment')
      .lean();

    res.render('home', { title: 'Tafteria', establishments, reviews, layout: 'index' });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Define a route for the login page
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login | Tafteria', layout: 'index' });
});

// Define a route for the register page
app.get('/register', (req, res) => {
  res.render('register', { title: 'Register | Tafteria', layout: 'index' });
});

// Define a route for the establishments page
app.get('/establishments', async (req, res, next) => {
  let establishments = await Establishment.find({}).lean();
  res.render('establishments', { title: 'Establishments | Tafteria', establishments: establishments, layout: 'index', user: req.session.user });
});

app.get('/profile', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    // Find the logged-in user's details
    const user = await User.findById(req.session.user.id).lean();

    // Find all reviews written by the logged-in user and populate the establishment field
    const reviews = await Reviews.find({ user: req.session.user.id }).populate('establishment').lean();

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


// Handle establishments: render to pages
app.get('/establishments/:id', async (req, res) => {
  const id = req.params.id;
  const userId = req.session.user?.id;
  
  try {
    let establishmentData = await Establishment.findById(id).lean();
    // Find reviews related to the specific establishment
    let reviews = await Reviews.find({ establishment: id })
                               .populate('user')
                               .populate('comments.user')
                               .populate('likesUserIds')
                               .lean();
    
    console.log("Reviews: ", reviews);
    console.log("Establishments: ", establishmentData);
    console.log("ID: ", id);
    console.log("User ID: ", userId);

    if (establishmentData) {
      res.render('pages', {
        title: 'Tafteria',
        establishmentData: establishmentData,
        reviews: reviews,
        user: req.session.user,
        layout: 'index'
      });
    } else {
      res.status(404).send('Establishment not found');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving establishment');
  }
});




// Handle user registration
app.post('/register', upload.single('avatar'), async (req, res) => {
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

    res.redirect('/home-user');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error registering new user.');
  }
});

// Handle user login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        description: user.description,
        joinedDate: user.joinedDate
      };
      console.log('User logged in:', req.session.user);
      res.redirect('/home-user');
    } else {
      res.status(401).send('Invalid username or password.');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error logging in.');
  }
});

// Route to add a comment to a review
app.post('/reviews/:id/comments', async (req, res) => {
  const reviewId = req.params.id;
  const { text, establishmentId } = req.body;
  const user = req.session.user;

  if (!user || !user.id) {
    return res.status(401).send('You must be logged in to comment.');
  }

  try {
    await Reviews.findByIdAndUpdate(reviewId, {
      $push: { comments: { user: user.id, text } }
    });
    res.redirect(`/establishments/${establishmentId}`);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).send('Error adding comment.');
  }
});


// Route to Handle profile edit
app.post('/profile/edit', upload.single('avatar'), [
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
      const { description } = req.body;
      const avatar = req.file ? req.file.filename : req.session.user.avatar;

      // Update the user profile
      await User.findByIdAndUpdate(userId, {
          avatar,
          description
      });

      // Update session data
      req.session.user.avatar = avatar;
      req.session.user.description = description;

      res.redirect('/profile');
  } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).send('Error updating profile.');
  }
});


// Define a route for the home page of user
app.get('/home-user', async (req, res) => {
  if (req.session.user) {
    console.log('Session user:', req.session.user);

    try {
      // Fetch establishments
      let establishments = await Establishment.find({}).lean();

      // Fetch reviews for the logged-in user and sort them by date in descending order
      let reviews = await Reviews.find({})
        .sort({ date: -1 }) // Sort reviews by date in descending order
        .populate('establishment')
        .populate('user')
        .lean();

      console.log("Reviews",reviews);
      res.render('home-user', {
        title: 'User-Home | Tafteria',
        user: req.session.user,
        establishments: establishments,
        reviews: reviews,
        layout: 'index'
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).send('Error fetching data.');
    }
  } else {
    res.redirect('/login');
  }
});

// About
app.get('/about', (req, res) => {
  const user = req.session.user;
  const data = {
    title: 'About | Tafteria',
    npmPackages: [
      { name: 'bcrypt', version: '^5.1.1', description: 'Library for hashing passwords.' },
      { name: 'body-parser', version: '^1.20.2', description: 'Middleware for parsing request bodies.' },
      { name: 'crypto', version: '^1.0.1', description: 'Core Node.js module for cryptographic functions.' },
      { name: 'dotenv', version: '^16.4.5', description: 'Loads environment variables from a .env file.' },
      { name: 'express', version: '^4.19.2', description: 'Fast, minimalist web framework for Node.js.' },
      { name: 'express-handlebars', version: '^7.1.3', description: 'Handlebars view engine for Express.' },
      { name: 'express-session', version: '^1.18.0', description: 'Middleware for managing session data.' },
      { name: 'express-validator', version: '^6.14.0', description: 'Express middleware for validation.' },
      { name: 'hbs', version: '^4.2.0', description: 'Handlebars templating library.' },
      { name: 'moment', version: '^2.30.1', description: 'Library for parsing, validating, and formatting dates.' },
      { name: 'mongoose', version: '^8.5.0', description: 'MongoDB object modeling tool for Node.js.' },
      { name: 'multer', version: '^1.4.5-lts.1', description: 'Middleware for handling file uploads.' }
    ],
    thirdPartyLibraries: [
      { name: 'Handlebars', description: 'Templating engine used for rendering dynamic HTML.' },
      { name: 'Tailwind CSS', description: 'Utility-first CSS framework for designing custom user interfaces.' }
      // Add more third-party libraries if applicable
    ]
  };

  try {
    res.render('about', {
      title: 'About | Tafteria',
      user,
      data
    });
  } catch (error) {
    console.error('Error rendering about page:', error);
    res.status(500).send('An error occurred while rendering the about page.');
  }
});



// Handle user logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

// Handle review input
app.post('/establishments/:id/reviews', async (req, res) => {
  const establishmentId = req.params.id;
  const { rating, comment } = req.body;
  const user = req.session.user;

  if (!user || !user.id) {
    return res.status(401).send('You must be logged in to post a review.');
  }

  try {
    const newReview = new Reviews({
      user: user.id,
      rating,
      comment,
      establishment: establishmentId
    });

    await newReview.save();
    res.redirect(`/establishments/${establishmentId}`);
  } catch (error) {
    console.error('Error posting review:', error);
    res.status(500).send('Error posting review.');
  }
});

// Define a route for search results
app.get('/search', async (req, res) => {
  // Extract the query parameter and trim it for case-insensitive search
  const query = req.query.q ? req.query.q.trim() : '';
  console.log('Search Query:', query);
  const user = req.session.user;

  try {
    // Search for establishments based on exact match of the query in name or description
    const establishments = await Establishment.find({
      $or: [
        { name: { $regex: `\\b${query}\\b`, $options: 'i' } },
        { description: { $regex: `\\b${query}\\b`, $options: 'i' } }
      ]
    }).lean();
    console.log('Establishments Found:', establishments);

    // Search for reviews based on exact match of the query in comment
    const reviews = await Reviews.find({
      $or: [
        { comment: { $regex: `\\b${query}\\b`, $options: 'i' } },
        { 'establishment.name': { $regex: `\\b${query}\\b`, $options: 'i' } }
      ]
    }).populate('user').populate('establishment').lean();
    console.log('Reviews Found:', reviews);

    // Render the search results page with the query, establishments, and reviews
    res.render('search', {
      title: 'Search Results | Tafteria',
      user,
      query,
      establishments,
      reviews
    });
  } catch (error) {
    console.error('Search Error:', error);
    res.status(500).send('Error performing search.');
  }
});

// Delete review route
app.delete('/reviews/:id', async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.session.user.id;

  try {
    const review = await Reviews.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    if (review.user.toString() !== userId) {
      return res.status(403).send('Unauthorized');
    }

    await Reviews.findByIdAndDelete(reviewId);
    res.status(200).send('Review deleted successfully');
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).send('Error deleting review');
  }
});

// Edit review route
app.post('/reviews/:id/edit', async (req, res) => {
  const reviewId = req.params.id;
  const { comment } = req.body;
  const userId = req.session.user.id;

  try {
    const review = await Reviews.findById(reviewId);

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

//Mark as helpful
app.post('/reviews/:id/like', async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).send('You must be logged in to like a review.');
  }

  try {
    const review = await Reviews.findById(reviewId);

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

// Edit review route
app.post('/profile/reviews/:id/edit', async (req, res) => {
  const reviewId = req.params.id;
  const { comment } = req.body;
  const userId = req.session.user.id;

  try {
    const review = await Reviews.findById(reviewId);

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

// Delete review route
app.post('/profile/reviews/:id/delete', async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.session.user.id;

  try {
    const review = await Reviews.findById(reviewId);

    if (!review) {
      return res.status(404).send('Review not found');
    }

    if (review.user.toString() !== userId) {
      return res.status(403).send('Unauthorized');
    }

    await Reviews.findByIdAndDelete(reviewId);
    res.redirect('/profile'); // Redirect back to profile
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).send('Error deleting review');
  }
});


// Error handling for 404
app.use((req, res, next) => {
  res.status(404).send('Page not found');
});

// Close MongoDB connection
function finalClose() {
  console.log('Close connection at the end.');
  mongoose.connection.close();
  process.exit();
}

process.on('SIGTERM', finalClose);
process.on('SIGINT', finalClose);
process.on('SIGQUIT', finalClose);

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});