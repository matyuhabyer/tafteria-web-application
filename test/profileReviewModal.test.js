const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Handlebars = require('handlebars');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const profilePage = read('views/profile.hbs');
const detailPage = read('views/pages.hbs');
const clientScript = read('public/js/script.js');
const authRoutes = read('routes/auth.js');
const establishmentRoutes = read('routes/establishments.js');
const reviewRoutes = read('routes/reviews.js');

test('profile review chooser is an accessible searchable modal', () => {
  assert.doesNotThrow(() => Handlebars.precompile(profilePage));
  assert.match(profilePage, /id="openProfileReviewModalBtn"/);
  assert.match(profilePage, /id="profileReviewModal"[^>]*aria-modal="true"[^>]*role="dialog"/);
  assert.match(profilePage, /id="profile-review-place-search"/);
  assert.match(profilePage, /data-profile-review-option/);
  assert.match(profilePage, /id="profileReviewFormModal"[^>]*aria-modal="true"[^>]*role="dialog"/);
  assert.match(profilePage, /id="profileReviewForm"/);
  assert.match(profilePage, /name="returnTo" value="profile"/);
  assert.match(clientScript, /function initProfileReviewModal/);
  assert.match(clientScript, /data-profile-review-empty/);
});

test('profile selection opens its own review modal without navigating to an establishment page', () => {
  assert.match(authRoutes, /Establishment\.find\(\{\}\).*sort\(\{ name: 1 \}\)/s);
  assert.doesNotMatch(profilePage, /\?review=1/);
  assert.doesNotMatch(establishmentRoutes, /openReviewModal/);
  assert.doesNotMatch(detailPage, /id="ratingModal"[^>]*data-auto-open=/);
  assert.match(clientScript, /establishmentOpenModal\(reviewModal, openButton\)/);
  assert.match(clientScript, /form\.setAttribute\('action', '\/establishments\/' \+ encodeURIComponent\(establishmentId\) \+ '\/reviews'\)/);
  assert.match(reviewRoutes, /req\.body\.returnTo === 'profile'/);
  assert.match(reviewRoutes, /'\/profile\?review=submitted'/);
});
