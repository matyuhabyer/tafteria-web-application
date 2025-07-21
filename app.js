// Import and configure dotenv
require('dotenv').config({ path: 'key.env' });

const express = require('express');
const app = express();
const path = require('path');
const handlebars = require('express-handlebars');
const mongoose = require('mongoose');
const session = require('express-session');
const bodyParser = require('body-parser');

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