const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Handlebars = require('handlebars');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

const establishmentsPage = read('views/establishments.hbs');
const detailPage = read('views/pages.hbs');
const profilePage = read('views/profile.hbs');
const favoriteScript = read('public/js/script.js');
const userModel = read('models/User.js');
const establishmentRoutes = read('routes/establishments.js');

test('favorite templates compile and expose controls in browse, detail, and profile views', () => {
  assert.doesNotThrow(() => Handlebars.precompile(establishmentsPage));
  assert.doesNotThrow(() => Handlebars.precompile(detailPage));
  assert.doesNotThrow(() => Handlebars.precompile(profilePage));
  assert.match(establishmentsPage, /data-favorite-button/);
  assert.match(detailPage, /data-favorite-label/);
  assert.match(profilePage, /data-favorite-list/);
  assert.match(profilePage, /data-remove-card-on-unfavorite/);
});

test('favorite establishments use a separate referenced collection from favorite foods', () => {
  assert.match(userModel, /favorites:\s*\{\s*type:\s*String\s*\}/);
  assert.match(userModel, /favoriteEstablishments:\s*\[\{[^}]*ref:\s*'Establishment'/);
  assert.doesNotMatch(profilePage, /Favorite foods/);
  assert.doesNotMatch(profilePage, /name="favorites"/);
});

test('favorite toggles are session protected and update without a page reload', () => {
  assert.match(establishmentRoutes, /router\.post\('\/api\/establishments\/:id\/favorite'/);
  assert.match(establishmentRoutes, /status\(401\)\.json/);
  assert.match(establishmentRoutes, /favoriteEstablishments\.addToSet/);
  assert.match(establishmentRoutes, /favoriteEstablishments\.pull/);
  assert.match(favoriteScript, /fetch\('\/api\/establishments\/' \+ establishmentId \+ '\/favorite'/);
  assert.doesNotMatch(favoriteScript, /favorite[\s\S]{0,300}window\.location\.reload/);
});
