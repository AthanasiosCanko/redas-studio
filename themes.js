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

  // Outline jack-o'-lantern: five overlapping lobes, a tapered stem that
  // hooks at the tip and flares into a cap, slanted eyes and a blocky grin.
  // The face is masked out of the lobe seams so they don't run through it
  // (works on any background); each copy needs its own mask id.
  const EYES  = 'M33 37L46 40.5Q42.5 45 37.5 48.5Q34.5 43.5 33 37ZM67 37L54 40.5Q57.5 45 62.5 48.5Q65.5 43.5 67 37Z';
  const GRIN  = 'M24 59Q31 62.5 38 63.5V67.5H43V64.2H57V67.5H62V63.5Q69 62.5 76 59Q68 70.5 53 73.5V68.5H47V73.5Q32 70.5 24 59Z';
  let maskId = 0;
  function pumpkin() {
    const id = `pk-face-${++maskId}`;
    return svg('0 0 100 90', `
      <mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="90">
        <rect width="100" height="90" fill="#fff"/>
        <path d="${EYES}${GRIN}" fill="#000" stroke="#000" stroke-width="3"/>
      </mask>
      <g stroke-width="1.6">
        <g mask="url(#${id})">
          <path d="M33 22C14 20 6 36 6 52C6 68 16 80 34 80M67 22C86 20 94 36 94 52C94 68 84 80 66 80"/>
          <path d="M40 20.5C24 22 18 38 18 52C18 68 28 81 44 82M60 20.5C76 22 82 38 82 52C82 68 72 81 56 82"/>
          <path d="M38 22C27 30 26 68 38 79Q50 85 62 79C74 68 73 30 62 22"/>
          <path d="M33 22Q36 20 40 20.5M67 22Q64 20 60 20.5"/>
        </g>
        <path d="M38 22Q50 26 62 22"/>
        <path d="M38 22C45 20 47.5 15 48.5 8C49 5 50.5 3.5 53 3L53.5 6.5C51.5 7 51.5 9 52 11C53 16 55.5 20 62 22"/>
        <path d="${EYES}"/>
        <path d="${GRIN}"/>
      </g>`);
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
