/**
 * Home page: GSAP + ScrollTrigger for featured sections.
 * Hero keeps CSS animations; this handles scroll-driven reveals only.
 * Lucide is initialized by /js/script.js after this runs.
 */
document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  var ease = 'power3.out';

  gsap.utils.toArray('.home-featured-animate').forEach(function (el) {
    gsap.from(el, {
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
      y: 40,
      opacity: 0,
      duration: 0.75,
      ease: ease,
    });
  });

  gsap.utils.toArray('.home-card-stagger').forEach(function (container) {
    var cards = container.querySelectorAll('.home-stagger-item');
    if (!cards.length) {
      return;
    }
    gsap.from(cards, {
      scrollTrigger: {
        trigger: container,
        start: 'top 88%',
        toggleActions: 'play none none none',
      },
      y: 32,
      opacity: 0,
      duration: 0.5,
      stagger: 0.07,
      ease: 'power2.out',
    });
  });

  window.addEventListener(
    'load',
    function () {
      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    },
    { once: true }
  );
});
