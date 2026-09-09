/* No network, DOM, or extension API dependencies; shared with the tests. */
(function (root) {
  'use strict';
  function novelURL(raw, base) {
    try {
      const u = new URL(raw, base);
      if (!/^https?:$/.test(u.protocol) || u.username || u.password || u.port) return null;
      if (!/(^|\.)novelcool\.com$/i.test(u.hostname)) return null;
      return u;
    } catch { return null; }
  }
  function chapter(raw, base) {
    const u = novelURL(raw, base);
    if (!u || !/^\/chapter\/[^/]+\/\d+\/$/.test(u.pathname)) return null;
    return u.href;
  }
  function isRedirect(raw, base) {
    try {
      const u = new URL(raw, base);
      return /(^|\.)(mechanismexplained|explorefunctionality)\.com$/i.test(u.hostname) || /^\/go\/rds(?:\/|$)/i.test(u.pathname);
    } catch { return false; }
  }
  function navigation(links, base) {
    const current = chapter(base, base);
    const chapters = [];
    const seen = new Set();
    let previous = null, next = null, catalogue = null;
    for (const item of links) {
      const u = novelURL(item.href, base);
      if (!u) continue;
      if (!catalogue && /^\/novel\/[^/]+\.html$/.test(u.pathname)) catalogue = u.href;
      const url = chapter(u.href, base);
      if (!url) continue;
      const label = String(item.text || '').trim();
      if (/prev(?:ious)?/i.test(label) && url !== current) previous ||= url;
      if (/next/i.test(label) && url !== current) next ||= url;
      if (!seen.has(url)) {
        seen.add(url);
        let fallback=u.pathname.split('/')[2];
        try { fallback=decodeURIComponent(fallback); } catch {}
        chapters.push({url, label: label || fallback.replaceAll('-', ' ')});
      } else if (label && !/prev(?:ious)?|next/i.test(label)) {
        const existing=chapters.find(item=>item.url===url);
        if (/prev(?:ious)?|next/i.test(existing.label)) existing.label=label;
      }
    }
    return {previous, next, catalogue, chapters};
  }
  function preferences(input = {}) {
    return {
      fontSize: Math.min(32, Math.max(16, Number(input.fontSize) || 20)),
      theme: ['paper', 'dark', 'light'].includes(input.theme) ? input.theme : 'paper'
    };
  }
  const api = Object.freeze({novelURL, chapter, isRedirect, navigation, preferences});
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NovelCoolGuard = api;
})(typeof window !== 'undefined' ? window : this);
