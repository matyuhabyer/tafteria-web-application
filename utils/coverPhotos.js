function moderatorUsernames(value = process.env.COVER_PHOTO_MODERATOR_USERNAMES) {
  return new Set(
    String(value || '')
      .split(',')
      .map((username) => username.trim().toLocaleLowerCase())
      .filter(Boolean)
  );
}

function userId(value) {
  const candidate = value?._id || value?.id || value;
  return candidate ? String(candidate) : '';
}

function isCoverPhotoModerator(user, configuredUsernames) {
  const username = String(user?.username || '').trim().toLocaleLowerCase();
  return Boolean(username && moderatorUsernames(configuredUsernames).has(username));
}

function isEstablishmentOwner(user, establishment) {
  return Boolean(userId(user) && userId(user) === userId(establishment?.ownerUser));
}

function canManageCoverPhotos(user, establishment, configuredUsernames) {
  return isEstablishmentOwner(user, establishment)
    || isCoverPhotoModerator(user, configuredUsernames);
}

module.exports = {
  canManageCoverPhotos,
  isCoverPhotoModerator,
  isEstablishmentOwner,
  moderatorUsernames,
};

