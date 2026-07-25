/**
 * VURA motion layer
 *
 * Three things, in order of how much they matter:
 *   1. Scroll reveals  — opacity + translate, staggered within a group.
 *   2. Failsafe        — if anything here throws, content becomes visible.
 *
 * There was a parallax pass here that ran getBoundingClientRect on every
 * scroll frame. It was removed: the page already runs its own animation loops
 * for the gallery deck and the reels row, and stacking a third scroll-linked
 * loop on top was making scrolling stutter.
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

    initReveals(document);

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
