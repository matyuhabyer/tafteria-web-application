(function () {
  function showToast(message, type) {
    var region = document.getElementById('toast-region');
    if (!region) return;
    var toast = document.createElement('div');
    toast.className = 'toast-message' + (type === 'error' ? ' toast-message--error' : '');
    toast.textContent = message;
    region.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('is-visible'); });
    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { toast.remove(); }, 180);
    }, 3200);
  }
  window.showToast = showToast;

  function initShare() {
    document.querySelectorAll('[data-share-place]').forEach(function (button) {
      button.addEventListener('click', async function () {
        var name = button.getAttribute('data-place-name') || 'this place';
        try {
          if (navigator.share) await navigator.share({ title: name + ' · Tafteria', url: window.location.href });
          else {
            await navigator.clipboard.writeText(window.location.href);
            showToast('Link copied to your clipboard.');
          }
        } catch (error) {
          if (error && error.name !== 'AbortError') showToast('Could not share this place.', 'error');
        }
      });
    });
  }

  function initImagePreview() {
    var input = document.getElementById('photos');
    var preview = document.querySelector('[data-upload-preview]');
    if (!input || !preview) return;
    input.addEventListener('change', function () {
      preview.innerHTML = '';
      Array.from(input.files || []).slice(0, 5).forEach(function (file) {
        var img = document.createElement('img');
        img.alt = '';
        img.src = URL.createObjectURL(file);
        img.onload = function () { URL.revokeObjectURL(img.src); };
        preview.appendChild(img);
      });
    });
  }

  function initLightbox() {
    document.querySelectorAll('[data-lightbox-image]').forEach(function (image) {
      image.tabIndex = 0;
      image.setAttribute('role', 'button');
      function open() {
        var overlay = document.createElement('div');
        overlay.className = 'image-lightbox';
        overlay.innerHTML = '<button type="button" aria-label="Close image">×</button><img alt="" src="' + image.src.replace(/"/g, '&quot;') + '">';
        overlay.addEventListener('click', function (event) { if (event.target === overlay || event.target.tagName === 'BUTTON') overlay.remove(); });
        document.body.appendChild(overlay);
        overlay.querySelector('button').focus();
      }
      image.addEventListener('click', open);
      image.addEventListener('keydown', function (event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    });
  }

  function initReviewSort() {
    var select = document.querySelector('[data-review-sort]');
    var list = document.querySelector('[data-review-list]');
    if (!select || !list) return;
    select.addEventListener('change', function () {
      var cards = Array.from(list.querySelectorAll('[data-review-id]'));
      cards.sort(function (a, b) {
        if (select.value === 'highest') return Number(b.dataset.reviewRating) - Number(a.dataset.reviewRating);
        if (select.value === 'helpful') return Number(b.dataset.reviewLikes) - Number(a.dataset.reviewLikes);
        return new Date(b.dataset.reviewDate) - new Date(a.dataset.reviewDate);
      });
      cards.forEach(function (card) { list.appendChild(card); });
    });
  }

  function init() { initShare(); initImagePreview(); initLightbox(); initReviewSort(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
