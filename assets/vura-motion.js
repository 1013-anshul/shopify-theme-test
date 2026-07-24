/**
 * VURA motion layer
 *
 * Three things, in order of how much they matter:
 *   1. Scroll reveals  — opacity + translate, staggered within a group.
 *   2. Parallax        — scroll-linked transform on hero media.
 *   3. Failsafe        — if anything here throws, content becomes visible.
 *
 * Pairs with vura-motion.css. The CSS only applies while <html> carries the
 * .vura-motion class, which the inline boot snippet in theme.liquid sets.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');

  /** Drop the gate so every reveal paints, whatever state we were in. */
  function revealAll() {
    root.classList.remove('vura-motion');
  }

  /**
   * IntersectionObserver reports nothing when the viewport has no height —
   * print, a zero-size iframe, some embedded preview panes. The observers are
   * then set up correctly and simply never fire, which would strand revealed
   * content at opacity 0. A moment after boot, force anything already on
   * screen into its final state. Below-fold elements keep their reveal.
   */
  function sweep() {
    var vh = window.innerHeight;
    var pending = document.querySelectorAll('[data-vura-reveal]:not(.is-revealed)');
    Array.prototype.forEach.call(pending, function (el) {
      if (vh === 0 || el.getBoundingClientRect().top < vh) {
        el.classList.add('is-revealed');
      }
    });
  }

  if (window.Shopify && window.Shopify.designMode) {
    root.classList.add('vura-motion--design-mode');
  }

  /* ----------------------------------------------------------------------
     Reveals
     ---------------------------------------------------------------------- */

  var revealObserver = null;

  function initReveals(scope) {
    var targets = (scope || document).querySelectorAll('[data-vura-reveal]:not([data-vura-seen])');
    if (!targets.length) return;

    // Stagger: children of a [data-vura-stagger] parent animate in sequence.
    // Order is assigned once, up front, so it survives re-observation.
    (scope || document).querySelectorAll('[data-vura-stagger]').forEach(function (group) {
      group.querySelectorAll('[data-vura-reveal]').forEach(function (child, i) {
        if (!child.style.getPropertyValue('--reveal-order')) {
          child.style.setProperty('--reveal-order', String(i));
        }
      });
    });

    targets.forEach(function (el) {
      el.setAttribute('data-vura-seen', '');
      revealObserver.observe(el);
    });
  }

  /* ----------------------------------------------------------------------
     Parallax
     ---------------------------------------------------------------------- */

  var parallaxItems = [];
  var ticking = false;

  function measure(el) {
    var rect = el.getBoundingClientRect();
    var vh = window.innerHeight;
    var centre = rect.top + rect.height / 2;
    // -1 when the element sits below the fold, +1 once it is above it.
    var progress = (centre - vh / 2) / (vh / 2 + rect.height / 2);
    return Math.max(-1, Math.min(1, progress));
  }

  function paint() {
    ticking = false;
    for (var i = 0; i < parallaxItems.length; i++) {
      var item = parallaxItems[i];
      if (!item.visible) continue;
      var shift = measure(item.el) * item.speed * 100;
      item.el.style.setProperty('--parallax-y', shift.toFixed(2) + 'px');
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(paint);
  }

  var parallaxObserver = null;

  function initParallax(scope) {
    var els = (scope || document).querySelectorAll('[data-vura-parallax]:not([data-vura-px-seen])');
    els.forEach(function (el) {
      el.setAttribute('data-vura-px-seen', '');
      var speed = parseFloat(el.getAttribute('data-vura-parallax')) || 0.12;
      var scale = el.getAttribute('data-vura-parallax-scale');
      if (scale) el.style.setProperty('--parallax-scale', scale);
      parallaxItems.push({ el: el, speed: speed, visible: false });
      parallaxObserver.observe(el);
    });
    if (parallaxItems.length) paint();
  }

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */

  function start() {
    // Reduced motion: the CSS already neutralises every transform. Skip the
    // observers entirely rather than doing work nobody will see.
    if (REDUCED.matches) return;

    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target); // reveals are one-way
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.01 }
    );

    parallaxObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        for (var i = 0; i < parallaxItems.length; i++) {
          if (parallaxItems[i].el === entry.target) {
            parallaxItems[i].visible = entry.isIntersecting;
          }
        }
      });
      onScroll();
    });

    initReveals(document);
    initParallax(document);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Only now, with the observers actually wired, stand the boot failsafe
    // down. If anything above threw, it still fires and un-hides the page.
    window.clearTimeout(window.__vuraMotionFailsafe);
    window.setTimeout(sweep, 1200);
  }

  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  } catch (err) {
    revealAll();
    return;
  }

  // Theme editor swaps section markup in and out; re-scan the new subtree.
  if (window.Shopify && window.Shopify.designMode) {
    document.addEventListener('shopify:section:load', function (event) {
      if (REDUCED.matches) return;
      initReveals(event.target);
      initParallax(event.target);
    });
  }

  // Someone flipping the OS setting mid-session should get the static page.
  var onPrefChange = function () {
    if (REDUCED.matches) {
      document.querySelectorAll('[data-vura-reveal]').forEach(function (el) {
        el.classList.add('is-revealed');
      });
    }
  };
  if (REDUCED.addEventListener) REDUCED.addEventListener('change', onPrefChange);
})();
