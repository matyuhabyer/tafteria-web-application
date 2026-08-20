// Import and configure dotenv
require('dotenv').config({ path: 'key.env' });

const express = require('express');
const app = express();
const path = require('path');
const handlebars = require('express-handlebars');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');
const { safeJson } = require('./utils/text');

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
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  }
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
    safeJson: function (context) {
      return safeJson(context);
    },
    range: function (n) {
      return Array.from({ length: n }, (_, i) => i);
    },
    gt: function (a, b) {
      return a > b;
    },
    gte: function (a, b) {
      return a >= b;
    },
    eq: function (a, b) {
      return a === b;
    },
    /** Repeats n times; inner context is 1-based index (1..n) — used for 5-star rows. */
    times: function (n, options) {
      let accum = '';
      const count = Math.max(0, Math.floor(Number(n) || 0));
      for (let i = 0; i < count; ++i) {
        accum += options.fn(i + 1);
      }
      return accum;
    },
    sub: function (a, b) {
      return a - b;
    },
    add: function (a, b) {
      return a + b;
    },
    /** 0-based index + 1 (carousel dots, etc.) */
    inc: function (n) {
      return Number(n) + 1;
    }
  }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Set up MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tafteria')
  .then(() => console.log("Connected to MongoDB."))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

// Import routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const establishmentRoutes = require('./routes/establishments');
const reviewRoutes = require('./routes/reviews');

// Use routes
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', establishmentRoutes);
app.use('/', reviewRoutes);

// Error handling for 404
app.use((req, res, next) => {
  res.status(404).render('404', {
    title: 'Page not found | Tafteria',
    layout: 'index',
    user: req.session.user,
  });
});

app.use((err, req, res, next) => {
  console.error('Request error:', err);
  const status = err?.name === 'MulterError' || err?.message?.startsWith('Only ') ? 400 : 500;
  res.status(status).render('error', {
    title: status === 400 ? 'Upload problem | Tafteria' : 'Something went wrong | Tafteria',
    layout: 'index',
    user: req.session.user,
    status,
    message: status === 400 ? err.message : 'We could not finish that request. Please try again.',
  });
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
