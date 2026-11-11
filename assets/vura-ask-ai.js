/* "Ask AI about Vura" card (snippets/vura-ask-ai.liquid).
   Picking a question rewrites the app links; Gemini can't take a pre-filled question,
   so its button copies the question as it opens. Clicks go to Clarity as custom events
   (ask_ai_<app>) and to Shopify customer events as vura_ask_ai. */
(() => {
  const URLS = {
    chatgpt: (p) => 'https://chatgpt.com/?q=' + encodeURIComponent(p),
    perplexity: (p) => 'https://www.perplexity.ai/search?q=' + encodeURIComponent(p),
    claude: (p) => 'https://claude.ai/new?q=' + encodeURIComponent(p),
    gemini: () => 'https://gemini.google.com/app',
  };

  const track = (app, question) => {
    try { if (typeof window.clarity === 'function') window.clarity('event', 'ask_ai_' + app); } catch (e) {}
    try { window.Shopify?.analytics?.publish?.('vura_ask_ai', { app, question }); } catch (e) {}
  };

  // Resolves true only once the text is really on the clipboard. The textarea route is
  // for in-app browsers (Instagram, Facebook) that block navigator.clipboard.
  const copyText = (text) => {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      ta.remove();
      return ok;
    };
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true, () => fallback());
    }
    return Promise.resolve(fallback());
  };

  const init = (root) => {
    if (root.dataset.vaiReady) return;
    root.dataset.vaiReady = '1';

    const qs = [...root.querySelectorAll('[data-vai-q]')];
    const apps = [...root.querySelectorAll('[data-vai-app]')];
    const note = root.querySelector('[data-vai-note]');
    const defaultNote = note ? note.textContent : '';
    let current = qs.find((q) => q.getAttribute('aria-checked') === 'true') || qs[0];
    let noteTimer;

    const prompt = () => `${root.dataset.intro}\n\n${current.dataset.prompt}${root.dataset.tail || ''}`;
    const update = () => apps.forEach((a) => { a.href = URLS[a.dataset.vaiApp](prompt()); });
    const say = (msg) => {
      if (!note) return;
      clearTimeout(noteTimer);
      note.textContent = msg;
      note.classList.add('is-done');
      noteTimer = setTimeout(() => { note.textContent = defaultNote; note.classList.remove('is-done'); }, 6000);
    };
    const select = (q, focus) => {
      qs.forEach((x) => {
        const on = x === q;
        x.setAttribute('aria-checked', String(on));
        x.tabIndex = on ? 0 : -1;
      });
      current = q;
      if (focus) q.focus();
      update();
    };

    qs.forEach((q, i) => {
      q.addEventListener('click', () => select(q));
      q.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        select(qs[(i + step + qs.length) % qs.length], true);
      });
    });

    apps.forEach((a) => {
      a.addEventListener('click', () => {
        const app = a.dataset.vaiApp;
        track(app, current.dataset.vaiQ);
        if (app === 'gemini') {
          copyText(prompt()).then((ok) => say(ok ? 'Question copied. Paste it into Gemini.' : 'Tap "Copy question", then paste it into Gemini.'));
        }
      });
    });

    const copyBtn = root.querySelector('[data-vai-copy]');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        track('copy', current.dataset.vaiQ);
        copyText(prompt()).then((ok) => say(ok ? 'Copied. Paste it into any AI app.' : "This browser blocked copying. Try ChatGPT or Perplexity instead."));
      });
    }

    update();
  };

  const boot = () => document.querySelectorAll('[data-vai]').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  document.addEventListener('shopify:section:load', boot);
})();
