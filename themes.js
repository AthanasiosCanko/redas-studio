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
  // `gaps` lists ring:segment pairs to leave out, for a torn web with a
  // loose strand hanging from the break.
  function cobweb({ spokes = 6, rings = [28, 52, 78, 104], gaps = [] } = {}) {
    const R = 120;
    const pt = (r, i) => {
      const a = (i / (spokes - 1)) * Math.PI / 2;
      return [r * Math.cos(a), r * Math.sin(a)];
    };
    const f = n => n.toFixed(1);
    let d = '';
    for (let i = 0; i < spokes; i++) {
      const [x, y] = pt(R, i);
      d += `M0 0L${f(x)} ${f(y)}`;
    }
    rings.forEach((r, ri) => {
      for (let i = 0; i < spokes - 1; i++) {
        if (gaps.includes(`${ri}:${i}`)) continue;
        const [x1, y1] = pt(r, i), [x2, y2] = pt(r, i + 1), [cx, cy] = pt(r * 0.78, i + 0.5);
        d += `M${f(x1)} ${f(y1)}Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}`;
      }
    });
    if (gaps.length) {
      const [ri, i] = gaps[0].split(':').map(Number);
      const [x, y] = pt(rings[ri], i);
      d += `M${f(x)} ${f(y)}q4 10 -2 22q-3 6 1 11`;   // the loose strand
    }
    return svg('0 0 120 120', `<path d="${d}" stroke-width="0.9"/>`);
  }
  const WEB      = cobweb();
  const WEB_TORN = cobweb({ spokes: 5, rings: [32, 60, 90], gaps: ['1:2', '2:1'] });

  // Two bat poses, both symmetric about the body: wings spread, wings raised
  const BAT = svg('0 0 64 28',
    `<path d="M32 9L29.5 4L29 9.5Q22 7 15 3Q9 1 1 5Q6 9 6 14Q10 12 14 15Q17 13 21 17Q25 15 28 21Q30 18 32 26Q34 18 36 21Q39 15 43 17Q47 13 50 15Q54 12 58 14Q58 9 63 5Q55 1 49 3Q42 7 35 9.5L34.5 4Z" fill="currentColor" stroke="none"/>`);
  const BAT_UP = svg('0 0 48 28',
    `<path d="M24 16L22 11L21.5 16.5Q17 13 14 7Q10 2 3 1Q6 6 5 12Q8 12 10 15Q12 14 14 18Q17 17 19 22Q21 21 24 27Q27 21 29 22Q31 17 34 18Q36 14 38 15Q40 12 43 12Q42 6 45 1Q38 2 34 7Q31 13 26.5 16.5L26 11Z" fill="currentColor" stroke="none"/>`);

  // Jack-o'-lantern: a squat filled pumpkin with the ribs and face cut out
  // through a mask (so it reads on any background), a curled vine and a leaf.
  let maskId = 0;
  function pumpkin() {
    const id = `pk-mask-${++maskId}`;
    return svg('0 0 64 56', `
      <mask id="${id}">
        <path d="M32 16C22 12 11 14 6 22C1 30 2 44 9 50C15 55 25 55 32 53C39 55 49 55 55 50C62 44 63 30 58 22C53 14 42 12 32 16Z" fill="#fff"/>
        <path d="M14 19C7 30 7 42 14 51M50 19C57 30 57 42 50 51" stroke="#000" stroke-width="1.8"/>
        <g fill="#000">
          <path d="M17 31L29 25.5L27 36Z"/>
          <path d="M47 31L35 25.5L37 36Z"/>
          <path d="M32 35.5L28.8 41H35.2Z"/>
          <path d="M14 41Q32 57 50 41Q46 44.5 43 44L41 48.5L37.5 45.5Q32 47 26.5 45.5L23 48.5L21 44Q18 44.5 14 41Z"/>
        </g>
      </mask>
      <rect width="64" height="56" fill="currentColor" stroke="none" mask="url(#${id})"/>
      <path d="M30 17C30 11 31 6 35 3L38 5C35 8 34 12 34 17Z" fill="currentColor" stroke="none"/>
      <path d="M36 8C41 3 48 5 47 10C46 13 42 12 43 9.5" stroke-width="1.1"/>
      <path d="M37 13C41 9 48 10 51 14C47 17 41 17 37 13Z" fill="currentColor" stroke="none"/>`);
  }

  const SPIDER = svg('0 0 24 100',
    `<path d="M12 0V82" stroke-width="0.8"/>
     <g stroke-width="1.2">
       <path d="M9 86Q4 82 2 85M9 88Q3 88 2 92M15 86Q20 82 22 85M15 88Q21 88 22 92"/>
     </g>
     <ellipse cx="12" cy="88" rx="4" ry="5" fill="currentColor" stroke="none"/>`);

  // [container selector, modifier classes, markup]
  const THEMES = {
    halloween: () => [
      ['.hero',        'deco--web deco--tl',                    WEB],
      ['.hero',        'deco--web deco--tr',                    WEB_TORN],
      ['.hero',        'deco--web deco--web-sm deco--bl',       WEB_TORN],
      ['.hero',        'deco--bat deco--bat1',                  BAT],
      ['.hero',        'deco--bat deco--bat2',                  BAT_UP],
      ['.hero',        'deco--bat deco--bat3',                  BAT],
      ['.hero',        'deco--bat deco--bat4',                  BAT_UP],
      ['.hero',        'deco--bat deco--bat5',                  BAT],
      ['.hero',        'deco--bat deco--bat6',                  BAT_UP],
      ['.ps-pin',      'deco--web deco--web-sm deco--tl',       WEB],
      ['.ps-pin',      'deco--web deco--web-sm deco--br',       WEB_TORN],
      ['.ps-pin',      'deco--bat deco--bat7',                  BAT_UP],
      ['.booking',     'deco--web deco--web-sm deco--tr',       WEB],
      ['.booking',     'deco--spider',                          SPIDER],
      ['.booking',     'deco--bat deco--bat8',                  BAT],
      ['.booking',     'deco--bat deco--bat9',                  BAT_UP],
      ['.site-footer', 'deco--web deco--web-sm deco--light deco--tl', WEB_TORN],
      ['.site-footer', 'deco--web deco--web-sm deco--light deco--tr', WEB],
      ['.site-footer', 'deco--pumpkin deco--bl',                pumpkin()],
      ['.site-footer', 'deco--pumpkin deco--pumpkin-sm deco--bl2', pumpkin()],
      ['.site-footer', 'deco--pumpkin deco--br',                pumpkin()],
    ],
  };

  function apply(theme) {
    if (!THEMES[theme]) return;
    const decos = THEMES[theme]();
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
