// Lucide icons (https://lucide.dev) — UMD bundle loaded before this script in layout
function initLucideIcons() {
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}
window.refreshLucideIcons = initLucideIcons;

function establishmentModalLockBody() {
  document.body.style.overflow = 'hidden';
}

function establishmentModalUnlockBody() {
  var open = document.querySelector('.establishment-modal-overlay:not(.hidden)');
  if (!open) {
    document.body.style.overflow = '';
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

  function bindOverlayClose(overlay) {
    if (!overlay) {
      return;
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        overlay.classList.add('hidden');
        establishmentModalUnlockBody();
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
      ratingModal.classList.remove('hidden');
      establishmentModalLockBody();
      if (typeof window.refreshLucideIcons === 'function') {
        window.refreshLucideIcons();
      }
    });
  }

  if (closeModalBtn && ratingModal) {
    closeModalBtn.addEventListener('click', function () {
      ratingModal.classList.add('hidden');
      establishmentModalUnlockBody();
    });
  }

  bindOverlayClose(ratingModal);
  bindOverlayClose(editModal);

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
        modal.classList.remove('hidden');
        establishmentModalLockBody();
        if (typeof window.refreshLucideIcons === 'function') {
          window.refreshLucideIcons();
        }
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
        alert('Please select a rating before submitting.');
        return;
      }
      if (!commentVal) {
        e.preventDefault();
        alert('Please write a comment before submitting.');
      }
    });
  }

  var starLabels = document.querySelectorAll('#ratingModal .star-rating label');
  starLabels.forEach(function (label, index) {
    label.addEventListener('click', function () {
      starLabels.forEach(function (l) {
        l.style.color = '#ccc';
      });
      for (var i = 0; i <= index; i++) {
        starLabels[i].style.color = '#fc0';
      }
    });
  });

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
    overlays.forEach(function (el) {
      el.classList.add('hidden');
    });
    establishmentModalUnlockBody();
  });
}

function closeCommentModal(reviewId) {
  var el = document.getElementById('commentModal-' + reviewId);
  if (el) {
    el.classList.add('hidden');
  }
  establishmentModalUnlockBody();
}

// Sidebar Toggle
function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  if (sidebar.style.width === '0px' || sidebar.style.width === '') {
    sidebar.style.width = '250px';
  } else {
    sidebar.style.width = '0';
  }
}

// Review interactions (like / edit / delete) — safe on pages without review cards
document.addEventListener('DOMContentLoaded', function () {
  initLucideIcons();
  initEstablishmentModals();

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
            alert(errorMessage);
          }
        } catch (error) {
          console.error('Error:', error);
          alert('An error occurred while marking as helpful');
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
          editModal.classList.remove('hidden');
          establishmentModalLockBody();
        }
      });
    });

    if (closeEditBtn) {
      closeEditBtn.addEventListener('click', function () {
        editModal.classList.add('hidden');
        establishmentModalUnlockBody();
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
          alert('Failed to delete review');
        }
      } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while deleting the review');
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
