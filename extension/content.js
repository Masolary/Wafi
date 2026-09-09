(() => {
  'use strict';
  const api = typeof browser !== 'undefined' ? browser : chrome;
  const core = window.NovelCoolGuard;
  let enabled = false;
  let observer;

  // This is secondary hardening. Response-header CSP is the primary protection;
  // deleting script elements after insertion cannot reliably stop their execution.
  function removeRefresh() {
    document.querySelectorAll('meta[http-equiv]').forEach(node => {
      if (node.httpEquiv.toLowerCase() === 'refresh') node.remove();
    });
  }
  function guardClick(event) {
    if (!enabled) return;
    const a = event.composedPath().find(node => node?.tagName === 'A');
    if (a && core.isRedirect(a.getAttribute('href'), location.href)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (status) status.textContent = 'Advertising link blocked. Reload this page to restore its original chapter links.';
    }
  }
  window.addEventListener('click', guardClick, true);
  window.addEventListener('auxclick', guardClick, true);
  let status;

  async function start() {
    try {
      enabled = !(await api.storage.local.get('disabled')).disabled;
    } catch { return; }
    if (!enabled) return;
    removeRefresh();
    observer = new MutationObserver(removeRefresh);
    observer.observe(document.documentElement, {childList: true, subtree: true});
    if (document.readyState === 'loading') await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, {once:true}));
    if (document.getElementById('novelcool-reader-guard')) return;
    const host = document.createElement('div');
    host.id = 'novelcool-reader-guard';
    const shadow = host.attachShadow({mode:'open'});
    const style = document.createElement('style');
    style.textContent = `
      :host{all:initial;display:block;position:relative;z-index:2147483646;color-scheme:light dark}
      *{box-sizing:border-box} .bar{font:14px system-ui,sans-serif;background:#145b50;color:#fff;padding:12px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .brand{font-weight:700}.status{font-size:12px;flex-basis:100%;opacity:.9}
      button,a,select{font:inherit}button,a{border:1px solid #b8d3c9;border-radius:8px;padding:8px 12px;cursor:pointer;background:#fff;color:#17483e;text-decoration:none;display:inline-block}
      button:disabled{opacity:.5;cursor:not-allowed}select{padding:8px;max-width:260px;border-radius:6px;background:#fff;color:#17352f}
      :focus-visible{outline:3px solid #e5af46;outline-offset:3px}
      dialog{width:100%;max-width:none;height:100%;max-height:none;margin:0;padding:0;border:0;background:#f7f1e3;color:#282b27;overflow:auto}
      dialog[data-theme=dark]{background:#191f22;color:#e5e7e8}dialog[data-theme=light]{background:#fff;color:#212523}
      .readerbar{position:sticky;top:0;background:inherit;border-bottom:1px solid #8885;display:flex;flex-wrap:wrap;gap:8px;padding:10px 16px;z-index:1;font:14px system-ui,sans-serif}
      article{max-width:780px;margin:auto;padding:32px 24px 56px;font:20px/1.8 Georgia,serif;overflow-wrap:anywhere}
      h1{font:700 1.5em/1.3 system-ui,sans-serif;margin:0 0 32px}p{white-space:pre-line;margin:0 0 1.1em}
      nav{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0;font:15px system-ui,sans-serif}
      @media(max-width:480px){article{padding:24px 18px}.brand{width:100%}.bar{gap:8px}select{max-width:100%}}
    `;
    shadow.append(style);
    function el(tag, text, parent) {
      const node = document.createElement(tag);
      if (text) node.textContent = text;
      if (parent) parent.append(node);
      return node;
    }
    const bar = el('div', '', shadow); bar.className = 'bar';
    el('span', 'NovelCool Reader Guard', bar).className = 'brand';
    const links = [...document.querySelectorAll('a[href]')].map(a => ({href:a.getAttribute('href'),text:a.textContent}));
    const nav = core.navigation(links, location.href);
    // The site's server HTML also supplies these original URLs as plain text.
    // Validate them; never decode an advertising token or guess numeric IDs.
    nav.previous = core.chapter(document.getElementById('prev_chp_url')?.textContent?.trim(), location.href) || nav.previous;
    nav.next = core.chapter(document.getElementById('next_chp_url')?.textContent?.trim(), location.href) || nav.next;
    function navigation(parent) {
      for (const [label, url] of [['← Previous',nav.previous],['Chapter list',nav.catalogue],['Next →',nav.next]]) {
        if (url) {const a = el('a',label,parent);a.href = url;}
      }
    }
    navigation(bar);
    // NovelCool creates this wrapper with document.write. With page scripts
    // blocked, the existing title and paragraphs belong to its parent instead.
    const section = document.querySelector('.chapter-reading-section') || document.querySelector('h2.chapter-title')?.parentElement;
    // Never reveal hidden content or dismiss access / age-verification dialogs.
    const visible = node => !!node && !!node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
    const gated = [...document.querySelectorAll('[role="dialog"],dialog,[class*="adult"],[class*="age-"],[class*="warning"]')].some(node => visible(node) && /18|age|verify|sign in|log in|subscribe/i.test(node.innerText || ''));
    const paragraphs = section && !gated ? [...section.querySelectorAll(':scope > p')].filter(visible).map(p=>p.innerText.trim()).filter(Boolean) : [];
    if (paragraphs.length > 1) section.classList.add('ncr-text-section');
    const clean = el('button','Clean reading',bar); clean.type='button';
    clean.disabled = paragraphs.length < 2;
    clean.title = clean.disabled ? 'No accessible text chapter detected. Original page is unchanged.' : 'Open a distraction-free view of this chapter';
    const chapterLinks = nav.chapters.filter(x => !/^(?:<<)?prev|^next/i.test(x.label));
    if (chapterLinks.length > 1) {
      const select = el('select','',bar); select.setAttribute('aria-label','Jump to chapter');
      const placeholder = el('option','Jump to chapter…',select); placeholder.value='';
      chapterLinks.forEach(item=>{const o=el('option',item.label,select);o.value=item.url;});
      select.addEventListener('change',()=>{if(core.chapter(select.value,location.href)) location.assign(select.value);});
    }
    status = el('span', 'Protection enabled. Reload after changing extension settings. Comments and other script-based controls may be unavailable.', bar);
    status.className='status';status.setAttribute('role','status');
    document.body.prepend(host);
    let prefs = core.preferences();
    try {prefs=core.preferences(await api.storage.local.get(['fontSize','theme']));} catch {}
    const dialog=el('dialog','',shadow); dialog.setAttribute('aria-label','Clean chapter reader');
    const readerbar=el('div','',dialog);readerbar.className='readerbar';
    const close=el('button','Close reader',readerbar);
    const smaller=el('button','A−',readerbar);smaller.setAttribute('aria-label','Smaller text');
    const larger=el('button','A+',readerbar);larger.setAttribute('aria-label','Larger text');
    const theme=el('select','',readerbar);theme.setAttribute('aria-label','Reading theme');
    ['paper','dark','light'].forEach(t=>{const o=el('option',t[0].toUpperCase()+t.slice(1),theme);o.value=t;});
    navigation(readerbar);
    const article=el('article','',dialog);
    el('h1',section?.querySelector('h1,h2')?.innerText || document.title,article);
    paragraphs.forEach(text=>el('p',text,article));
    const bottom=el('nav','',article);bottom.setAttribute('aria-label','Chapter navigation');navigation(bottom);
    function applyPreferences() {
      prefs=core.preferences(prefs);article.style.fontSize=prefs.fontSize+'px';dialog.dataset.theme=prefs.theme;theme.value=prefs.theme;
      smaller.disabled=prefs.fontSize<=16;larger.disabled=prefs.fontSize>=32;
    }
    function save(){applyPreferences();api.storage.local.set(prefs).catch(()=>{});}
    applyPreferences();
    smaller.addEventListener('click',()=>{prefs.fontSize-=2;save();});
    larger.addEventListener('click',()=>{prefs.fontSize+=2;save();});
    theme.addEventListener('change',()=>{prefs.theme=theme.value;save();});
    clean.addEventListener('click',()=>dialog.showModal());
    close.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>clean.focus());
  }
  start().catch(error=>console.warn('NovelCool Reader Guard could not add reading controls:',error.message));
})();
