const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Handlebars = require('handlebars');

const pagePath = path.join(__dirname, '..', 'views', 'pages.hbs');
const pageSource = fs.readFileSync(pagePath, 'utf8');
const scriptSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'script.js'), 'utf8');

test('establishment detail template compiles', () => {
  assert.doesNotThrow(() => Handlebars.precompile(pageSource));
});

test('at-a-glance details omit source provenance rows', () => {
  assert.doesNotMatch(pageSource, /<strong>Data source<\/strong>/);
  assert.doesNotMatch(pageSource, /<strong>Image source<\/strong>/);
});

test('review rating options run from one star on the left to five on the right', () => {
  const pickerStart = pageSource.indexOf('<div class="star-rating"');
  const pickerEnd = pageSource.indexOf('</div>', pickerStart);
  const picker = pageSource.slice(pickerStart, pickerEnd);
  const optionPositions = [1, 2, 3, 4, 5].map((rating) =>
    picker.indexOf(`name="rating" value="${rating}"`)
  );

  assert.ok(pickerStart >= 0, 'rating picker should exist');
  assert.ok(optionPositions.every((position) => position >= 0), 'all five ratings should exist');
  assert.deepEqual(optionPositions, [...optionPositions].sort((a, b) => a - b));
  assert.doesNotMatch(picker, /flex-row-reverse/);
});

test('cover photo workflow is contained in an auto-open capable modal', () => {
  const modalStart = pageSource.indexOf('id="coverPhotoModal"');
  const modalEnd = pageSource.indexOf('<div class="establishment-detail__lower-layout">');
  const modalSource = pageSource.slice(modalStart, modalEnd);

  assert.ok(modalStart >= 0, 'cover photo modal should exist');
  assert.match(modalSource, /data-auto-open=/);
  assert.match(modalSource, /action="\/establishments\/\{\{establishmentData\._id\}\}\/cover-photo"/);
  assert.match(modalSource, /class="cover-photo-signin"/);
  assert.match(modalSource, /href="\/login"/);
  assert.equal(pageSource.indexOf('action="/establishments/{{establishmentData._id}}/cover-photo"'), modalSource.indexOf('action="/establishments/{{establishmentData._id}}/cover-photo"') + modalStart);
});

test('reviews lead the lower content and location uses the side column', () => {
  const reviewsPosition = pageSource.indexOf('establishment-detail__reviews-section');
  const sidebarPosition = pageSource.indexOf('establishment-detail__side-column');
  const galleryPosition = pageSource.indexOf('establishment-detail__gallery-section');

  assert.ok(reviewsPosition >= 0 && sidebarPosition >= 0 && galleryPosition >= 0);
  assert.ok(reviewsPosition < sidebarPosition, 'reviews should precede the sidebar in document order');
  assert.ok(sidebarPosition < galleryPosition, 'gallery should follow reviews and mobile sidebar content');
  assert.match(pageSource.slice(sidebarPosition, galleryPosition), /establishment-detail__location-card/);
  assert.match(pageSource.slice(sidebarPosition, galleryPosition), /id="openCoverPhotoModalBtn"/);
});

test('cover modal uses the shared accessible modal controls', () => {
  assert.match(scriptSource, /establishmentOpenModal\(coverPhotoModal, openCoverPhotoModalBtn\)/);
  assert.match(scriptSource, /coverPhotoModal\.dataset\.autoOpen === 'true'/);
  assert.match(scriptSource, /data-modal-initial-focus/);
  assert.match(scriptSource, /establishmentModalReturnFocus\.focus\(\)/);
});
