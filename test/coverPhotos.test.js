const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canManageCoverPhotos,
  isCoverPhotoModerator,
  isEstablishmentOwner,
  moderatorUsernames,
} = require('../utils/coverPhotos');

test('cover photo moderator usernames are normalized and case-insensitive', () => {
  assert.deepEqual([...moderatorUsernames(' Alice,BOB, alice ')], ['alice', 'bob']);
  assert.equal(isCoverPhotoModerator({ username: 'aLiCe' }, 'Alice,Bob'), true);
  assert.equal(isCoverPhotoModerator({ username: 'Mallory' }, 'Alice,Bob'), false);
});

test('assigned establishment owners can manage cover photos', () => {
  const establishment = { ownerUser: '507f1f77bcf86cd799439011' };
  const owner = { id: '507f1f77bcf86cd799439011', username: 'owner' };
  const communityMember = { id: '507f191e810c19729de860ea', username: 'member' };
  assert.equal(isEstablishmentOwner(owner, establishment), true);
  assert.equal(canManageCoverPhotos(owner, establishment, ''), true);
  assert.equal(canManageCoverPhotos(communityMember, establishment, ''), false);
  assert.equal(canManageCoverPhotos(communityMember, establishment, 'member'), true);
});

