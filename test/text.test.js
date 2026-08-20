const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeRegex, safeJson, stripSourceBoilerplate } = require('../utils/text');

test('escapeRegex makes user input safe to use in a regular expression', () => {
  const escaped = escapeRegex('coffee (hot) + snacks?');
  assert.doesNotThrow(() => new RegExp(escaped, 'i'));
  assert.equal(new RegExp(escaped, 'i').test('coffee (hot) + snacks?'), true);
});

test('safeJson prevents closing a script element from stored data', () => {
  const value = safeJson({ name: '</script><script>alert(1)</script>' });
  assert.equal(value.includes('</script>'), false);
  assert.equal(JSON.parse(value).name, '</script><script>alert(1)</script>');
});

test('stripSourceBoilerplate removes legacy OpenStreetMap description copy', () => {
  assert.equal(
    stripSourceBoilerplate('Fast food near DLSU, mapped by the OpenStreetMap community.'),
    'Fast food near DLSU.'
  );
  assert.equal(stripSourceBoilerplate('Student favorite with affordable meals.'), 'Student favorite with affordable meals.');
});
