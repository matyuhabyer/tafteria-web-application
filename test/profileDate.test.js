const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const profilePage = fs.readFileSync(path.join(__dirname, '..', 'views', 'profile.hbs'), 'utf8');
const authRoutes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'auth.js'), 'utf8');

test('profile membership date uses month, day, and year only', () => {
  assert.match(profilePage, /Member since \{\{user\.joinedDateFormatted\}\}/);
  assert.doesNotMatch(profilePage, /Member since \{\{user\.joinedDate\}\}/);
  assert.match(authRoutes, /month: 'long', day: 'numeric', year: 'numeric'/);
});
