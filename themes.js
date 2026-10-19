/* ── R-EDA'S STUDIO — seasonal themes ────────────────────
 * The admin panel picks a theme (GET /api/theme); this adds small line-art
 * decorations around the page, mostly in the corners. The palette never
 * changes — every mark is drawn in currentColor, set from the brand browns
 * in themes.css. 'none' (or any failure) leaves the page untouched.
 * Preview without saving: /?theme=halloween
 */
(() => {
  'use strict';

  const svg = (viewBox, body, extra = '') =>
    `<svg viewBox="${viewBox}" ${extra} fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

  // Corner cobweb anchored at the top-left; CSS mirrors it for other corners.
  // Radials fan out over 90°, joined by threads that sag towards the corner.
  function cobweb() {
    const R = 120, spokes = 6, rings = [28, 52, 78, 104];
    const pt = (r, i) => {
      const a = (i / (spokes - 1)) * Math.PI / 2;
      return [r * Math.cos(a), r * Math.sin(a)];
    };
    let d = '';
    for (let i = 0; i < spokes; i++) {
      const [x, y] = pt(R, i);
      d += `M0 0L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    for (const r of rings) {
      for (let i = 0; i < spokes - 1; i++) {
        const [x1, y1] = pt(r, i), [x2, y2] = pt(r, i + 1), [cx, cy] = pt(r * 0.78, i + 0.5);
        d += `M${x1.toFixed(1)} ${y1.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
      }
    }
    return svg('0 0 120 120', `<path d="${d}" stroke-width="0.9"/>`);
  }

  // Symmetric about x=32: ears, wings rising to the tips, scalloped trailing edge
  const BAT = svg('0 0 64 28',
    `<path d="M32 9L29.5 4L29 9.5Q22 7 15 3Q9 1 1 5Q6 9 6 14Q10 12 14 15Q17 13 21 17Q25 15 28 21Q30 18 32 26Q34 18 36 21Q39 15 43 17Q47 13 50 15Q54 12 58 14Q58 9 63 5Q55 1 49 3Q42 7 35 9.5L34.5 4Z" fill="currentColor" stroke="none"/>`);

  const PUMPKIN = svg('0 0 48 44',
    `<g stroke-width="1.4">
       <ellipse cx="24" cy="28" rx="21" ry="14"/>
       <path d="M17 15Q10 28 17 41M31 15Q38 28 31 41M24 14Q22 6 27 2"/>
     </g>
     <g fill="currentColor" stroke="none">
       <path d="M14 26l3.5-5 3.5 5zM27 26l3.5-5 3.5 5z"/>
       <path d="M15 32l3 2.5 3-2.5 3 2.5 3-2.5 3 2.5 3-2.5-1 3.5h-16z"/>
     </g>`);

  const SPIDER = svg('0 0 24 100',
    `<path d="M12 0V82" stroke-width="0.8"/>
     <g stroke-width="1.2">
       <path d="M9 86Q4 82 2 85M9 88Q3 88 2 92M15 86Q20 82 22 85M15 88Q21 88 22 92"/>
     </g>
     <ellipse cx="12" cy="88" rx="4" ry="5" fill="currentColor" stroke="none"/>`);

  // [container selector, modifier classes, markup]
  const THEMES = {
    halloween: [
      ['.hero',         'deco--web deco--tl',          cobweb()],
      ['.hero',         'deco--web deco--tr',          cobweb()],
      ['.hero',         'deco--bat deco--bat1',        BAT],
      ['.hero',         'deco--bat deco--bat2',        BAT],
      ['.hero',         'deco--bat deco--bat3',        BAT],
      ['.ps-pin',       'deco--web deco--web-sm deco--tl', cobweb()],
      ['.booking',      'deco--web deco--web-sm deco--tr', cobweb()],
      ['.booking',      'deco--spider',                SPIDER],
      ['.site-footer',  'deco--pumpkin deco--bl',      PUMPKIN],
      ['.site-footer',  'deco--pumpkin deco--pumpkin-sm deco--br', PUMPKIN],
    ],
  };

  function apply(theme) {
    const decos = THEMES[theme];
    if (!decos) return;
    document.documentElement.dataset.theme = theme;
    for (const [selector, classes, markup] of decos) {
      const host = document.querySelector(selector);
      if (!host) continue;
      const el = document.createElement('div');
      el.className = `deco ${classes}`;
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = markup;
      host.appendChild(el);
    }
  }

  const preview = new URLSearchParams(location.search).get('theme');
  if (preview) return apply(preview);

  fetch('/api/theme')
    .then(r => (r.ok ? r.json() : {}))
    .then(({ theme }) => apply(theme))
    .catch(() => { /* no theme — standard site */ });
})();
