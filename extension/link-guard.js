(function(root) {
  'use strict';
  function install(win, doc, core, index, options = {}) {
    const base = () => options.base || win.location.href;
    const enabled = options.enabled || (() => true);
    const metadata = () => ({
      previous: doc.getElementById('prev_chp_url')?.textContent?.trim(),
      next: doc.getElementById('next_chp_url')?.textContent?.trim()
    });
    function repair(a) {
      const raw = a.getAttribute('href');
      const url = core.destination({href:raw, title:a.getAttribute('title'), text:a.textContent}, base(), metadata(), index);
      if (url && core.isRedirect(raw, base())) {
        a.setAttribute('href', url);
        // Mobile catalogue links open in the current Safari tab.
        a.removeAttribute('target');
        a.removeAttribute('onclick');
      }
      return url;
    }
    function refresh() {
      if (!enabled()) return;
      doc.querySelectorAll('a[href]').forEach(repair);
    }
    function click(event) {
      if (!enabled()) return;
      const a = event.composedPath().find(node => node?.tagName === 'A');
      if (!a) return;
      const url = repair(a);
      if (url && (core.chapter(url, base()) || /\/novel\/[^/]+\.html$/.test(new URL(url).pathname))) {
        event.stopImmediatePropagation();
        // Explicit navigation also works when a pre-existing page handler has
        // already cancelled the default action. Preserve modified-click behavior.
        if (event.type === 'click' && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !a.hasAttribute('download')) {
          event.preventDefault();
          win.location.assign(url);
        }
      } else if (core.isRedirect(a.getAttribute('href'), base())) {
        event.preventDefault();
        event.stopImmediatePropagation();
        options.onBlocked?.('This advertising link has no verified chapter destination. Open a direct chapter link.');
      }
    }
    win.addEventListener('click', click, true);
    win.addEventListener('auxclick', click, true);
    const observer = new win.MutationObserver(refresh);
    // Observe Document: documentElement can still be null at document_start.
    observer.observe(doc, {childList:true, subtree:true, attributes:true, attributeFilter:['href']});
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', refresh, {once:true});
    refresh();
    return {refresh};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = {install};
  else root.NovelCoolLinkGuard = Object.freeze({install});
})(typeof window !== 'undefined' ? window : this);
