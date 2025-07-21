# Routes Structure

This folder contains all the route handlers for the Tafteria application, organized by functionality.

## Route Files

### `index.js`
- **Purpose**: Main home page route
- **Routes**:
  - `GET /` - Home page with featured establishments and recent reviews

### `auth.js`
- **Purpose**: Authentication and user management routes
- **Routes**:
  - `GET /login` - Login page
  - `POST /login` - Handle user login
  - `GET /register` - Registration page
  - `POST /register` - Handle user registration
  - `GET /logout` - Handle user logout
  - `GET /profile` - User profile page
  - `POST /profile/edit` - Handle profile updates

### `establishments.js`
- **Purpose**: Establishment-related routes
- **Routes**:
  - `GET /establishments` - List all establishments
  - `GET /establishments/:id` - View specific establishment details
  - `GET /search` - Search establishments and reviews

### `reviews.js`
- **Purpose**: Review-related routes
- **Routes**:
  - `POST /establishments/:id/reviews` - Post a new review
  - `POST /reviews/:id/comments` - Add comment to review
  - `DELETE /reviews/:id` - Delete a review
  - `POST /reviews/:id/edit` - Edit a review
  - `POST /reviews/:id/like` - Like a review
  - `POST /profile/reviews/:id/edit` - Edit review from profile
  - `POST /profile/reviews/:id/delete` - Delete review from profile

## File Upload Handling

All routes that handle file uploads (avatars, review photos) use Multer middleware configured in their respective route files.

## Authentication

Routes that require authentication check for `req.session.user` and redirect to login if not authenticated.

## Error Handling

All routes include proper error handling with try-catch blocks and appropriate HTTP status codes. 