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

  // ── Independence Day (28 Nëntor 1912) ─────────────────────
  // Double-headed eagle: the left half, mirrored about x=50.
  const EAGLE_HALF = 'M50.6 36C47 32 44 27 42.5 22C41.5 17 38 14 33 14.5C29 15 26 17 24.5 20.5L23.5 23L26.5 21.5C28 20.5 29.5 20.5 30.5 22L28 24C31 24 33 25.5 34 28.5C35 32 37 35 40 38C34 35 26 30 18 20C17 17 17 13 18 10L14 16L11 9L10 17L5 13L7 21L2 20L6 27L1 28L6 33L2 36L8 39L5 44L12 45L10 50L17 50L16 56L23 54L24 60L31 56C35 58 38 60 40.5 62.5L39 66L32 68L37 70.5L31 74L38 74L35 80L41 77.5L39 85L45 80L45.5 88L50.6 83Z';
  const eagleShape = fill =>
    `<path d="${EAGLE_HALF}" fill="${fill}"/><path d="${EAGLE_HALF}" fill="${fill}" transform="matrix(-1 0 0 1 100 0)"/>`;
  const EAGLE = svg('0 0 100 92', eagleShape('currentColor'), 'stroke="none"');

  // A flag waving from a pole: outlined cloth with the eagle at its centre
  const FLAG_BODY = `
    <path d="M4 3V63" stroke-width="1.6"/>
    <circle cx="4" cy="2.4" r="1.9" fill="currentColor" stroke="none"/>
    <path d="M5 6C18 2 30 12 45 7V34C30 39 18 29 5 33Z" stroke-width="1.3"/>
    <g transform="translate(15.5 9) scale(0.2)" stroke="none">${eagleShape('currentColor')}</g>`;
  const FLAG = svg('0 0 60 64', FLAG_BODY);
  // Two flags whose poles cross, cloths flying outward
  const CROSSED_FLAGS = svg('0 0 100 72',
    `<g transform="translate(30 5) rotate(22 4 63)">${FLAG_BODY}</g>
     <g transform="matrix(-1 0 0 1 100 0) translate(30 5) rotate(22 4 63)">${FLAG_BODY}</g>`);

  // Bunting: a garland sagging from the corner, pennants hung along it
  function bunting() {
    const P0 = [0, 4], C = [100, 70], P1 = [220, 0];
    const at = t => [0, 1].map(k => (1 - t) ** 2 * P0[k] + 2 * (1 - t) * t * C[k] + t * t * P1[k]);
    const slope = t => Math.atan2(
      2 * (1 - t) * (C[1] - P0[1]) + 2 * t * (P1[1] - C[1]),
      2 * (1 - t) * (C[0] - P0[0]) + 2 * t * (P1[0] - C[0])) * 180 / Math.PI;
    let pennants = '';
    for (let i = 0, n = 9; i < n; i++) {
      const t = 0.08 + i * (0.84 / (n - 1));
      const [x, y] = at(t);
      const solid = i % 2 === 0;
      pennants += `<path d="M-6 0H6L0 16Z" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${slope(t).toFixed(1)})"
        ${solid ? 'fill="currentColor" stroke="none"' : 'stroke-width="1.1"'}/>`;
    }
    return svg('0 0 220 70', `<path d="M${P0}Q${C} ${P1}" stroke-width="1"/>${pennants}`);
  }

  const DATE_MARK = `<span class="deco-date">28 Nëntor 1912</span>`;

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
    independence: () => [
      ['.hero',        'deco--bunting deco--tl',                bunting()],
      ['.hero',        'deco--bunting deco--tr',                bunting()],
      ['.hero',        'deco--eagle deco--bl',                  EAGLE],
      ['.hero',        'deco--flags deco--br',                  CROSSED_FLAGS],
      ['.ps-pin',      'deco--flag deco--tl',                   FLAG],
      ['.ps-pin',      'deco--eagle deco--eagle-sm deco--br',   EAGLE],
      ['.booking',     'deco--eagle deco--tr',                  EAGLE],
      ['.booking',     'deco--date deco--tl',                   DATE_MARK],
      ['.site-footer', 'deco--bunting deco--light deco--tl',    bunting()],
      ['.site-footer', 'deco--bunting deco--light deco--tr',    bunting()],
      ['.site-footer', 'deco--eagle deco--light deco--bl',      EAGLE],
      ['.site-footer', 'deco--eagle deco--light deco--br',      EAGLE],
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
