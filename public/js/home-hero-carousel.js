/**
 * Home hero: image carousel (prev/next, dots, autoplay, keyboard).
 */
(function () {
  function init(root) {
    var track = root.querySelector('.hero-carousel__track');
    var slides = root.querySelectorAll('.hero-carousel__slide');
    if (!track || slides.length < 2) return;

    var prevBtn = root.querySelector('.hero-carousel__btn--prev');
    var nextBtn = root.querySelector('.hero-carousel__btn--next');
    var dots = root.querySelectorAll('.hero-carousel__dot');
    var i = 0;
    var n = slides.length;
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var AUTOPLAY_MS = reduced ? 0 : 6500;
    var timer;

    function go(to) {
      i = (to + n) % n;
      track.style.transform = 'translateX(-' + i * 100 + '%)';
      dots.forEach(function (d, j) {
        var active = j === i;
        d.classList.toggle('is-active', active);
        d.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    function next() {
      go(i + 1);
    }
    function prev() {
      go(i - 1);
    }

    function resetTimer() {
      if (!AUTOPLAY_MS) return;
      clearInterval(timer);
      timer = setInterval(next, AUTOPLAY_MS);
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { prev(); resetTimer(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { next(); resetTimer(); });
    dots.forEach(function (dot, j) {
      dot.addEventListener('click', function () {
        go(j);
        resetTimer();
      });
    });

    if (AUTOPLAY_MS) {
      resetTimer();
      root.addEventListener('mouseenter', function () { clearInterval(timer); });
      root.addEventListener('mouseleave', resetTimer);
    }

    root.setAttribute('tabindex', '0');
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
        resetTimer();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
        resetTimer();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-hero-carousel]');
    if (root) init(root);
  });
})();
