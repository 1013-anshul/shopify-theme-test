/* Vura unboxing video (snippets/vura-unboxing-video) — inline autoplay + full-screen player.
   Markup: <div class="vvid" data-vvid [data-vvid-warm="load"] [data-vvid-zone="#id"]
                [data-vvid-deck]><video muted playsinline loop preload="none"
                poster="…first frame…" data-src="….mp4"></video></div>
           any element with [data-vvid-open] opens the full-screen player.

   Why there is no visible loading:
   - the poster is the clip's own first frame (≈40 KB), so the still and the
     first played frame are identical;
   - the 1.7 MB file starts downloading one screen before it is needed (or
     right after the page has loaded, for slides hidden inside a carousel),
     and never earlier, so it never competes with the page itself;
   - the full-screen player reuses the same file, already in the cache. */
(function () {
  if (window.vvid) return;

  var conn = navigator.connection || {};
  var lite = !!conn.saveData || /(^|slow-)2g$/.test(conn.effectiveType || '');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var autoplay = !lite && !still;

  var PLAY_ICON = '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M5 3.2v13.6c0 .7.8 1.2 1.4.8l10.4-6.8c.6-.4.6-1.2 0-1.6L6.4 2.4C5.8 2 5 2.5 5 3.2z"/></svg>';

  function vid(box) { return box.querySelector('video'); }

  function warm(box) {
    var v = vid(box);
    if (!v || v.getAttribute('src')) return;
    v.preload = 'auto';
    v.src = v.getAttribute('data-src');
  }

  function wantsPlay(box) {
    if (!autoplay || box.__vis < 0.5 || document.hidden || overlayOpen) return false;
    if (box.hasAttribute('data-vvid-deck')) {
      var card = box.closest('.vura-gallery__card');
      if (!card || parseInt(card.style.zIndex || '0', 10) < 960) return false;
    }
    return true;
  }

  function sync(box) {
    var v = vid(box);
    if (!v) return;
    if (wantsPlay(box)) {
      warm(box);
      if (v.paused) {
        var p = v.play();
        if (p && p.catch) p.catch(function () { box.classList.add('vvid--tap'); });
      }
    } else if (!v.paused) {
      v.pause();
    }
  }

  var boxes = [];
  var playIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.__vis = e.intersectionRatio; sync(e.target); });
  }, { threshold: [0, 0.5, 0.75] }) : null;

  // One screen of look-ahead: start fetching before the video scrolls in.
  var warmIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting || !autoplay) return;
      (e.target.__vvidBoxes || []).forEach(warm);
      warmIO.unobserve(e.target);
    });
  }, { rootMargin: '100% 0px 100% 0px' }) : null;

  function afterLoad(fn) {
    var go = function () {
      if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 1500 }); else setTimeout(fn, 300);
    };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }

  function init(box) {
    if (box.__vvid) return;
    box.__vvid = true;
    box.__vis = 0;
    boxes.push(box);
    var v = vid(box);
    v.muted = true; v.defaultMuted = true; v.playsInline = true;

    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'vvid__play'; btn.setAttribute('aria-label', 'Play video');
    btn.innerHTML = PLAY_ICON;
    btn.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); open(box); });
    box.appendChild(btn);

    if (!autoplay) box.classList.add('vvid--tap');
    if (playIO) playIO.observe(box);
    if (box.getAttribute('data-vvid-warm') === 'load') {
      if (autoplay) afterLoad(function () { warm(box); });
    } else if (warmIO) {
      var zoneSel = box.getAttribute('data-vvid-zone');
      var zone = (zoneSel && document.querySelector(zoneSel)) || box;
      (zone.__vvidBoxes = zone.__vvidBoxes || []).push(box);
      warmIO.observe(zone);
    }

    // Deck cards change "front" without scrolling; re-check while on screen.
    if (box.hasAttribute('data-vvid-deck')) {
      setInterval(function () { if (box.__vis > 0) sync(box); }, 200);
    }
  }

  /* ---------------- Full-screen player ---------------- */
  var ov, ovVid, ovBar, ovMute, overlayOpen = false, rafId = null, srcBox = null;

  function icon(muted) {
    return muted
      ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor"/><path d="M13.5 7.5l4 5M17.5 7.5l-4 5"/></svg>'
      : '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h3l4-3.5v11L6 12H3z" fill="currentColor"/><path d="M13.5 7a4.5 4.5 0 0 1 0 6M15.8 5a7.5 7.5 0 0 1 0 10"/></svg>';
  }

  function build() {
    ov = document.createElement('div');
    ov.className = 'vvid-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Vura unboxing video');
    ov.innerHTML =
      '<video playsinline loop preload="auto"></video>' +
      '<div class="vvid-ov__bar"><i></i></div>' +
      '<button type="button" class="vvid-ov__btn vvid-ov__x" aria-label="Close video">' +
        '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15"/></svg></button>' +
      '<button type="button" class="vvid-ov__btn vvid-ov__mute" aria-label="Mute"></button>';
    document.body.appendChild(ov);
    ovVid = ov.querySelector('video');
    ovBar = ov.querySelector('.vvid-ov__bar i');
    ovMute = ov.querySelector('.vvid-ov__mute');
    ov.querySelector('.vvid-ov__x').addEventListener('click', function () { close(true); });
    ovMute.addEventListener('click', function () { setMuted(!ovVid.muted); });
    ovVid.addEventListener('click', function () { if (ovVid.paused) ovVid.play(); else ovVid.pause(); });
    document.addEventListener('keydown', function (e) { if (overlayOpen && e.key === 'Escape') close(true); });
    window.addEventListener('popstate', function () { if (overlayOpen) close(false); });
  }

  function setMuted(m) {
    ovVid.muted = m;
    ovMute.innerHTML = icon(m);
    ovMute.setAttribute('aria-label', m ? 'Turn sound on' : 'Mute');
  }

  function tick() {
    if (ovVid.duration) ovBar.style.width = (ovVid.currentTime / ovVid.duration * 100).toFixed(2) + '%';
    rafId = requestAnimationFrame(tick);
  }

  function open(box) {
    if (!ov) build();
    srcBox = box;
    var v = vid(box);
    overlayOpen = true;
    boxes.forEach(sync); // pauses the inline copies
    if (ovVid.getAttribute('src') !== v.getAttribute('data-src')) ovVid.src = v.getAttribute('data-src');
    ovVid.poster = v.poster;
    ovVid.currentTime = 0;
    setMuted(false);
    var p = ovVid.play(); // called inside the tap, so sound is allowed
    if (p && p.catch) p.catch(function () { setMuted(true); ovVid.play(); });
    document.documentElement.classList.add('vvid-lock');
    ov.classList.add('is-open');
    requestAnimationFrame(function () { ov.classList.add('is-shown'); });
    try { history.pushState({ vvid: 1 }, ''); } catch (e) {}
    rafId = requestAnimationFrame(tick);
    ov.querySelector('.vvid-ov__x').focus({ preventScroll: true });
  }

  function close(viaButton) {
    if (!overlayOpen) return;
    overlayOpen = false;
    ovVid.pause();
    cancelAnimationFrame(rafId);
    ov.classList.remove('is-shown', 'is-open');
    document.documentElement.classList.remove('vvid-lock');
    if (viaButton && history.state && history.state.vvid) { try { history.back(); } catch (e) {} }
    boxes.forEach(sync);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-vvid-open]');
    if (!t) return;
    e.preventDefault(); e.stopPropagation();
    var box = (t.closest('[data-vvid-scope]') || document).querySelector('[data-vvid]');
    if (box) open(box);
  }, true);
  // Keyboard: the slide and the card are role="button" containers.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = e.target;
    if (!t.matches || !t.matches('[data-vvid-open][role="button"]')) return;
    e.preventDefault();
    var box = (t.closest('[data-vvid-scope]') || document).querySelector('[data-vvid]');
    if (box) open(box);
  });
  // A tap on a deck card's button must not start a card drag.
  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('[data-vvid-open], .vvid__play')) e.stopPropagation();
  }, true);

  document.addEventListener('visibilitychange', function () { boxes.forEach(sync); });

  function scan() { document.querySelectorAll('[data-vvid]').forEach(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();

  window.vvid = { scan: scan, open: open, sync: function () { boxes.forEach(sync); } };
})();
