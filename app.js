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

// Models
const User = require('./models/User');
const Establishment = require('./models/Establishment');
const Reviews = require('./models/Review')

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
app.get('/', (req, res) => {
  res.render('home', { title: 'Tafteria' , layout:'index'});
});

// Define a route for the login page
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login | Tafteria', layout:'index'});
});

// Define a route for the register page
app.get('/register', (req, res) => {
  res.render('register', { title: 'Register | Tafteria' , layout:'index'});
});

// Define a route for the establishments page
app.get('/establishments', async (req, res, next) => {
  let establishments = await Establishment.find({}).lean();
  res.render('establishments', { title: 'Establishments | Tafteria', establishments:establishments, layout: 'index', user: req.session.user}); 
});

app.get('/profile', async (req, res) => {
  res.render('profile', { title: 'Profile | Tafteria', layout: 'index', user: req.session.user}); 
});

//Handle establishments: render to pages
app.get('/establishments/:id', async (req, res) => {
  const id = req.params.id;
  try {
    let establishmentData = await Establishment.findById(id).lean();
    let reviews = await Reviews.find({ establishment: id }).lean().populate('user'); // Populate user data from User model
    // Assuming you want to fetch the user who made the first review (just an example)
    let user = reviews.length > 0 ? reviews[0].user : null; // Adjust based on your logic

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
        description: user.description
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

// Define a route for the home page of user
app.get('/home-user', (req, res) => {
  if (req.session.user) {
    console.log('Session user:', req.session.user);
    res.render('home-user', {
      title: 'User-Home | Tafteria',
      user: req.session.user,
      layout: 'index'
    });
  } else {
    res.redirect('/login');
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

//Handle review input
app.post('/establishments/:id/reviews', async (req, res) => {
  const establishmentId = req.params.id;
  const { rating, comment } = req.body;
  const user = req.session.user;

  console.log('Session User:', user);
  console.log('Establishment ID:', establishmentId);

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




