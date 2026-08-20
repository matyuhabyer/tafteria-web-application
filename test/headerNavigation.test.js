const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const headerSource = fs.readFileSync(path.join(root, 'views', 'partials', 'header-user.hbs'), 'utf8');
const layoutSource = fs.readFileSync(path.join(root, 'views', 'layouts', 'index.hbs'), 'utf8');
const scriptSource = fs.readFileSync(path.join(root, 'public', 'js', 'script.js'), 'utf8');

test('account dropdown trigger is placed beside and after the profile control', () => {
  const profilePosition = headerSource.indexOf('class="site-profile-link"');
  const menuPosition = headerSource.indexOf('id="site-menu-button"');

  assert.ok(profilePosition >= 0 && menuPosition >= 0);
  assert.ok(profilePosition < menuPosition);
  assert.match(headerSource, /aria-haspopup="menu"/);
  assert.match(headerSource, /id="site-menu-dropdown"[^>]*role="menu"[^>]*hidden/);
});

test('legacy sliding sidebar is no longer rendered', () => {
  assert.doesNotMatch(layoutSource, /\{\{>\s*sidebar\s*\}\}/);
  assert.doesNotMatch(scriptSource, /toggleSidebar/);
});

test('account dropdown supports outside-click and Escape dismissal', () => {
  assert.match(scriptSource, /!menu\.contains\(event\.target\)/);
  assert.match(scriptSource, /event\.key === 'Escape'/);
  assert.match(scriptSource, /button\.setAttribute\('aria-expanded'/);
});
