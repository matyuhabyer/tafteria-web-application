// Lucide icons (https://lucide.dev) — UMD bundle loaded before this script in layout
function initLucideIcons() {
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}
window.refreshLucideIcons = initLucideIcons;

function notify(message, type) {
  if (typeof window.showToast === 'function') window.showToast(message, type);
  else window.alert(message);
}

function establishmentModalLockBody() {
  document.body.style.overflow = 'hidden';
}

function establishmentModalUnlockBody() {
  var open = document.querySelector('.establishment-modal-overlay:not(.hidden)');
  if (!open) {
    document.body.style.overflow = '';
  }
}

var establishmentModalReturnFocus = null;

function establishmentOpenModal(overlay, trigger) {
  if (!overlay) return;
  establishmentModalReturnFocus = trigger || document.activeElement;
  overlay.classList.remove('hidden');
  establishmentModalLockBody();
  if (typeof window.refreshLucideIcons === 'function') {
    window.refreshLucideIcons();
  }
  window.requestAnimationFrame(function () {
    var initialFocus = overlay.querySelector('[data-modal-initial-focus], button, [href], input, textarea, select');
    if (initialFocus) initialFocus.focus();
  });
}

function establishmentCloseModal(overlay, restoreFocus) {
  if (!overlay) return;
  overlay.classList.add('hidden');
  establishmentModalUnlockBody();
  if (restoreFocus !== false) {
    if (establishmentModalReturnFocus && typeof establishmentModalReturnFocus.focus === 'function') {
      establishmentModalReturnFocus.focus();
    }
    establishmentModalReturnFocus = null;
  }
}

/** Establishment detail page: /establishments/:id — modals, star form, comments */
function initEstablishmentModals() {
  var root = document.querySelector('.establishment-detail');
  if (!root) {
    return;
  }

  var ratingModal = document.getElementById('ratingModal');
  var openModalBtn = document.getElementById('openModalBtn');
  var closeModalBtn = document.getElementById('closeModalBtn');
  var editModal = document.getElementById('editModal');
  var coverPhotoModal = document.getElementById('coverPhotoModal');
  var openCoverPhotoModalBtn = document.getElementById('openCoverPhotoModalBtn');
  var closeCoverPhotoModalBtn = document.getElementById('closeCoverPhotoModalBtn');

  function bindOverlayClose(overlay) {
    if (!overlay) {
      return;
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        establishmentCloseModal(overlay);
      }
    });
    var panel = overlay.querySelector('.establishment-modal-panel');
    if (panel) {
      panel.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }
  }

  if (openModalBtn && ratingModal) {
    openModalBtn.addEventListener('click', function () {
      establishmentOpenModal(ratingModal, openModalBtn);
    });
  }

  if (closeModalBtn && ratingModal) {
    closeModalBtn.addEventListener('click', function () {
      establishmentCloseModal(ratingModal);
    });
  }

  if (openCoverPhotoModalBtn && coverPhotoModal) {
    openCoverPhotoModalBtn.addEventListener('click', function () {
      establishmentOpenModal(coverPhotoModal, openCoverPhotoModalBtn);
    });
  }

  if (closeCoverPhotoModalBtn && coverPhotoModal) {
    closeCoverPhotoModalBtn.addEventListener('click', function () {
      establishmentCloseModal(coverPhotoModal);
    });
  }

  bindOverlayClose(ratingModal);
  bindOverlayClose(editModal);
  bindOverlayClose(coverPhotoModal);

  if (coverPhotoModal && coverPhotoModal.dataset.autoOpen === 'true') {
    establishmentOpenModal(coverPhotoModal, openCoverPhotoModalBtn);
  }

  document.querySelectorAll('[id^="commentModal-"]').forEach(function (overlay) {
    bindOverlayClose(overlay);
  });

  document.querySelectorAll('.js-open-comment-modal').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-review-id');
      if (!id) {
        return;
      }
      var modal = document.getElementById('commentModal-' + id);
      if (modal) {
        establishmentOpenModal(modal, btn);
      }
    });
  });

  var reviewForm = ratingModal ? ratingModal.querySelector('form') : null;
  if (reviewForm) {
    reviewForm.addEventListener('submit', function (e) {
      var rating = ratingModal.querySelector('input[name="rating"]:checked');
      var comment = reviewForm.querySelector('textarea[name="comment"]');
      var commentVal = comment ? comment.value.trim() : '';

      if (!rating) {
        e.preventDefault();
        notify('Please select a rating before submitting.', 'error');
        return;
      }
      if (!commentVal) {
        e.preventDefault();
        notify('Please write a comment before submitting.', 'error');
      }
    });
  }

  document.addEventListener('keydown', function escEstablishment(e) {
    if (e.key !== 'Escape') {
      return;
    }
    if (!document.querySelector('.establishment-detail')) {
      return;
    }
    var overlays = document.querySelectorAll('.establishment-modal-overlay:not(.hidden)');
    if (overlays.length === 0) {
      return;
    }
    overlays.forEach(function (el, index) {
      establishmentCloseModal(el, index === overlays.length - 1);
    });
  });
}

function closeCommentModal(reviewId) {
  var el = document.getElementById('commentModal-' + reviewId);
  establishmentCloseModal(el);
}

function initSiteMenu() {
  var menu = document.querySelector('[data-site-menu]');
  if (!menu) return;
  var button = menu.querySelector('#site-menu-button');
  var dropdown = menu.querySelector('#site-menu-dropdown');
  if (!button || !dropdown) return;

  function setOpen(open, restoreFocus) {
    dropdown.hidden = !open;
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      if (typeof window.refreshLucideIcons === 'function') window.refreshLucideIcons();
    } else if (restoreFocus) {
      button.focus();
    }
  }

  button.addEventListener('click', function () {
    setOpen(dropdown.hidden, false);
  });

  document.addEventListener('click', function (event) {
    if (!dropdown.hidden && !menu.contains(event.target)) setOpen(false, false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !dropdown.hidden) setOpen(false, true);
  });
}

function initProfileReviewModal() {
  var pickerModal = document.getElementById('profileReviewModal');
  var reviewModal = document.getElementById('profileReviewFormModal');
  var openButton = document.getElementById('openProfileReviewModalBtn');
  var closePickerButton = document.getElementById('closeProfileReviewModalBtn');
  var closeReviewButton = document.getElementById('closeProfileReviewFormModalBtn');
  var backButton = document.getElementById('backToProfileReviewPlacesBtn');
  var search = document.getElementById('profile-review-place-search');
  var form = document.getElementById('profileReviewForm');
  if (!pickerModal || !reviewModal || !openButton || !closePickerButton || !closeReviewButton || !form) return;

  function closePicker() {
    establishmentCloseModal(pickerModal);
  }

  function closeReview() {
    establishmentCloseModal(reviewModal);
  }

  function stopPanelPropagation(modal) {
    var panel = modal.querySelector('.establishment-modal-panel');
    if (!panel) return;
    panel.addEventListener('click', function (event) {
      event.stopPropagation();
    });
  }

  openButton.addEventListener('click', function () {
    establishmentOpenModal(pickerModal, openButton);
  });
  closePickerButton.addEventListener('click', closePicker);
  closeReviewButton.addEventListener('click', closeReview);
  pickerModal.addEventListener('click', function (event) {
    if (event.target === pickerModal) closePicker();
  });
  reviewModal.addEventListener('click', function (event) {
    if (event.target === reviewModal) closeReview();
  });
  stopPanelPropagation(pickerModal);
  stopPanelPropagation(reviewModal);

  pickerModal.querySelectorAll('[data-profile-review-option]').forEach(function (option) {
    option.addEventListener('click', function () {
      var establishmentId = option.getAttribute('data-establishment-id');
      if (!establishmentId) return;

      form.reset();
      form.setAttribute('action', '/establishments/' + encodeURIComponent(establishmentId) + '/reviews');
      var name = reviewModal.querySelector('[data-profile-review-name]');
      var category = reviewModal.querySelector('[data-profile-review-category]');
      var image = reviewModal.querySelector('[data-profile-review-image]');
      if (name) name.textContent = option.getAttribute('data-establishment-name') || 'Selected establishment';
      if (category) category.textContent = option.getAttribute('data-establishment-category') || 'Taft, Manila';
      if (image) image.src = option.getAttribute('data-establishment-image') || '/images/place-placeholder.svg';

      establishmentCloseModal(pickerModal, false);
      establishmentOpenModal(reviewModal, openButton);
    });
  });

  if (backButton) {
    backButton.addEventListener('click', function () {
      establishmentCloseModal(reviewModal, false);
      establishmentOpenModal(pickerModal, openButton);
    });
  }

  if (search) {
    search.addEventListener('input', function () {
      var query = search.value.trim().toLocaleLowerCase();
      var visibleCount = 0;
      pickerModal.querySelectorAll('[data-profile-review-option]').forEach(function (option) {
        var matches = !query || String(option.getAttribute('data-search-text') || '').toLocaleLowerCase().includes(query);
        option.classList.toggle('hidden', !matches);
        if (matches) visibleCount += 1;
      });
      var empty = pickerModal.querySelector('[data-profile-review-empty]');
      if (empty) empty.classList.toggle('hidden', visibleCount !== 0);
    });
  }

  form.addEventListener('submit', function (event) {
    var rating = form.querySelector('input[name="rating"]:checked');
    var comment = form.querySelector('textarea[name="comment"]');
    if (!rating) {
      event.preventDefault();
      notify('Choose a star rating before publishing.', 'error');
      return;
    }
    if (!comment || !comment.value.trim()) {
      event.preventDefault();
      notify('Write a short review before publishing.', 'error');
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (!reviewModal.classList.contains('hidden')) closeReview();
    else if (!pickerModal.classList.contains('hidden')) closePicker();
  });
}

function initFavoriteButtons() {
  var buttons = document.querySelectorAll('[data-favorite-button]');
  if (!buttons.length) return;

  function updateButtons(establishmentId, favorited, placeName) {
    document.querySelectorAll('[data-favorite-button][data-establishment-id="' + establishmentId + '"]').forEach(function (button) {
      button.classList.toggle('is-favorite', favorited);
      button.setAttribute('aria-pressed', favorited ? 'true' : 'false');
      button.setAttribute('aria-label', (favorited ? 'Remove ' : 'Save ') + placeName + (favorited ? ' from favorites' : ' to favorites'));
      var label = button.querySelector('[data-favorite-label]');
      if (label) label.textContent = favorited ? 'Saved to favorites' : 'Save to favorites';
    });
  }

  function showEmptyFavoriteState() {
    var list = document.querySelector('[data-favorite-list]');
    if (!list || list.querySelector('[data-favorite-card]') || list.querySelector('[data-favorite-empty]')) return;
    var empty = document.createElement('div');
    empty.className = 'profile-favorites-empty';
    empty.setAttribute('data-favorite-empty', '');
    empty.innerHTML = '<i data-lucide="heart" aria-hidden="true"></i><p>No favorite places yet.</p><a href="/establishments">Explore establishments</a>';
    list.appendChild(empty);
    if (typeof window.refreshLucideIcons === 'function') window.refreshLucideIcons();
  }

  buttons.forEach(function (button) {
    button.addEventListener('click', async function () {
      var establishmentId = button.getAttribute('data-establishment-id');
      var placeName = button.getAttribute('data-place-name') || 'this place';
      if (!establishmentId || button.disabled) return;

      button.disabled = true;
      try {
        var response = await fetch('/api/establishments/' + establishmentId + '/favorite', {
          method: 'POST',
          headers: { Accept: 'application/json' },
        });
        var data = await response.json().catch(function () { return {}; });

        if (response.status === 401 && data.loginUrl) {
          window.location.assign(data.loginUrl);
          return;
        }
        if (!response.ok) throw new Error(data.error || 'Could not update favorites.');

        updateButtons(establishmentId, data.favorited, placeName);
        var count = document.querySelector('[data-profile-favorite-count]');
        if (count && typeof data.favoriteCount === 'number') count.textContent = String(data.favoriteCount);

        if (!data.favorited && button.hasAttribute('data-remove-card-on-unfavorite')) {
          var card = button.closest('[data-favorite-card]');
          if (card) card.remove();
          showEmptyFavoriteState();
        }

        notify(data.favorited ? placeName + ' saved to favorites.' : placeName + ' removed from favorites.', 'success');
      } catch (error) {
        notify(error.message || 'Could not update favorites.', 'error');
      } finally {
        button.disabled = false;
      }
    });
  });
}

// Review interactions (like / edit / delete) — safe on pages without review cards
document.addEventListener('DOMContentLoaded', function () {
  initLucideIcons();
  initSiteMenu();
  initEstablishmentModals();
  initProfileReviewModal();
  initFavoriteButtons();

  var editButtons = document.querySelectorAll('.openEditBtn');
  var editModal = document.getElementById('editModal');
  var editForm = document.getElementById('editForm');
  var editTextarea = document.getElementById('editTextarea');
  var closeEditBtn = document.getElementById('closeEditBtn');
  var likeButtons = document.querySelectorAll('.likeButton');

  if (likeButtons.length > 0) {
    likeButtons.forEach(function (likeButton) {
      likeButton.addEventListener('click', async function () {
        var reviewId = likeButton.dataset.reviewId;

        try {
          var response = await fetch('/reviews/' + reviewId + '/like', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            window.location.reload();
            likeButton.disabled = true;
          } else {
            var errorMessage = await response.text();
            notify(errorMessage, 'error');
          }
        } catch (error) {
          console.error('Error:', error);
          notify('An error occurred while marking as helpful.', 'error');
        }
      });
    });
  }

  if (editModal && editForm && editTextarea) {
    editButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var reviewContainer = button.closest('.review-container');
        if (reviewContainer) {
          var reviewId = reviewContainer.dataset.reviewId;
          var p = reviewContainer.querySelector('.review-content p');
          var currentComment = p ? p.textContent : '';

          editTextarea.value = currentComment;
          editForm.setAttribute('action', '/reviews/' + reviewId + '/edit');
          establishmentOpenModal(editModal, button);
        }
      });
    });

    if (closeEditBtn) {
      closeEditBtn.addEventListener('click', function () {
        establishmentCloseModal(editModal);
      });
    }
  }

  var deleteButtons = document.querySelectorAll('.deleteReviewBtn');

  deleteButtons.forEach(function (button) {
    button.addEventListener('click', async function () {
      if (!confirm('Are you sure you want to delete this review?')) {
        return;
      }
      var reviewContainer = button.closest('.review-container');
      if (!reviewContainer) {
        return;
      }
      var reviewId = reviewContainer.dataset.reviewId;

      try {
        var response = await fetch('/reviews/' + reviewId, {
          method: 'DELETE',
        });

        if (response.ok) {
          reviewContainer.remove();
        } else {
          notify('Failed to delete review.', 'error');
        }
      } catch (error) {
        console.error('Error:', error);
        notify('An error occurred while deleting the review.', 'error');
      }
    });
  });
});

//PROFILE MODAL
function showModal(action) {
  document.getElementById('futureModalTitle').textContent = action + ' - To be implemented in the future';
  document.getElementById('futureModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('futureModal').classList.add('hidden');
}
