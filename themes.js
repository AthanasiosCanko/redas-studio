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
  // The eagle from the national flag (traced from the owner's reference).
  // It is defined once as a <symbol> (see SPRITES) and every eagle <use>s it.
  const EAGLE_D = 'M2475 8705 c-16 -8 -41 -14 -54 -15 -41 0 -141 -72 -141 -101 0 -7 -33 -8 -99 -4 -172 13 -301 -44 -301 -133 0 -15 -3 -37 -6 -49 -8 -28 23 -44 40 -21 56 76 201 52 314 -52 73 -68 59 -80 -90 -80 -195 0 -310 43 -433 162 -138 134 -195 143 -195 29 0 -172 234 -265 652 -258 176 2 191 0 161 -30 -75 -75 -245 -77 -380 -4 -23 11 -53 6 -53 -10 0 -41 175 -139 246 -139 10 0 40 -6 68 -14 28 -8 83 -21 121 -29 146 -32 260 -61 270 -67 6 -4 26 -11 45 -14 42 -8 51 -12 155 -62 171 -80 338 -232 442 -399 117 -187 106 -481 -22 -593 -85 -75 -248 -105 -320 -58 -13 9 -30 16 -38 16 -107 0 -207 334 -146 485 9 22 20 68 24 103 11 100 26 88 -320 260 -170 84 -197 97 -310 147 -33 15 -78 35 -100 45 -22 9 -65 27 -95 39 -30 12 -64 26 -75 31 -107 50 -136 45 -209 -35 -46 -52 -54 -53 -151 -25 -139 40 -183 53 -200 60 -11 5 -42 18 -70 30 -27 11 -57 25 -65 30 -8 5 -33 19 -55 31 -120 65 -258 170 -365 280 -68 69 -138 160 -184 236 -50 85 -76 103 -142 103 -52 0 -134 -53 -134 -86 0 -5 -7 -22 -16 -39 -131 -244 195 -639 691 -836 126 -50 214 -79 240 -79 11 0 38 -7 60 -15 22 -8 77 -14 121 -15 157 0 220 -38 218 -129 -1 -104 -68 -141 -253 -141 -357 1 -575 68 -769 239 -93 81 -115 92 -179 89 -191 -10 -148 -320 65 -481 198 -149 554 -205 907 -142 212 38 255 31 255 -41 0 -49 -68 -144 -104 -144 -3 0 -24 -13 -48 -29 -81 -53 -221 -114 -303 -131 -135 -28 -179 -32 -244 -21 -97 16 -158 29 -178 39 -10 5 -40 20 -68 33 -27 13 -54 27 -60 32 -174 130 -188 137 -253 137 -97 0 -132 -133 -66 -258 8 -15 14 -30 14 -34 0 -17 65 -101 110 -141 208 -187 604 -170 1033 44 154 77 256 -3 162 -127 -44 -58 -430 -294 -480 -294 -4 0 -21 -6 -38 -14 -171 -74 -360 -69 -528 15 -205 102 -370 -29 -272 -216 67 -128 333 -184 583 -122 36 9 81 19 100 23 19 3 41 10 50 14 8 5 47 18 85 30 66 21 182 70 215 91 8 5 24 13 36 18 11 5 51 28 88 50 105 65 158 48 140 -45 -13 -69 -343 -343 -524 -435 -179 -91 -305 -108 -588 -83 -138 13 -202 -33 -202 -144 0 -287 353 -355 741 -143 8 5 39 22 68 37 73 41 78 43 161 98 41 28 118 82 170 122 164 123 222 124 228 2 5 -100 -40 -174 -209 -349 -109 -111 -306 -269 -336 -269 -4 0 -14 -6 -22 -13 -19 -16 -148 -69 -211 -87 -77 -22 -321 -25 -386 -4 -195 61 -278 -47 -179 -234 113 -213 604 -135 954 153 97 79 208 185 264 252 215 255 266 77 62 -216 -235 -337 -432 -516 -680 -616 -105 -43 -140 -48 -334 -52 -219 -5 -243 -11 -268 -71 -64 -152 167 -332 426 -332 122 0 195 22 324 98 65 38 270 241 537 533 58 62 108 116 111 119 3 3 65 70 138 150 224 245 311 257 311 42 0 -221 -128 -402 -360 -512 -83 -40 -105 -53 -137 -83 -87 -82 5 -217 147 -217 143 0 403 218 493 415 43 93 50 114 102 295 43 150 110 211 190 172 141 -68 76 -323 -137 -533 -119 -117 -127 -134 -75 -171 130 -93 370 82 507 370 17 37 38 79 46 94 8 14 14 32 14 40 0 33 71 99 103 96 73 -7 94 -94 51 -218 -14 -41 -28 -84 -31 -94 -20 -64 -136 -265 -183 -317 -121 -133 -249 -235 -350 -275 -8 -3 -30 -12 -47 -20 -115 -49 -158 -64 -215 -74 -27 -5 -52 -11 -57 -15 -5 -3 -33 -10 -61 -15 -142 -27 -146 -77 -15 -208 104 -104 110 -123 38 -137 -21 -3 -58 -13 -83 -20 -25 -8 -73 -21 -107 -30 -150 -37 -191 -47 -238 -60 -27 -8 -61 -16 -75 -18 -32 -6 -151 -36 -170 -44 -8 -3 -44 -14 -80 -23 -77 -21 -62 -27 -233 89 -70 47 -136 91 -145 96 -35 21 -77 50 -90 62 -7 7 -17 13 -22 13 -5 0 -22 26 -37 58 -55 117 -128 151 -239 110 -26 -9 -42 -9 -76 3 -72 24 -186 19 -226 -10 -36 -25 -30 -41 14 -41 58 0 139 -55 177 -120 67 -115 193 -158 333 -115 29 9 256 -197 238 -215 -26 -26 -471 12 -503 42 -133 125 -257 134 -376 28 -16 -14 -57 -34 -90 -44 -88 -26 -170 -117 -92 -102 106 20 108 20 197 -25 99 -50 230 -67 287 -36 15 8 44 23 63 34 31 16 47 18 120 11 47 -4 141 -10 210 -13 221 -11 227 -15 110 -77 -8 -5 -28 -17 -45 -28 -73 -48 -85 -52 -117 -41 -227 79 -423 -94 -454 -401 -8 -78 14 -97 41 -36 39 89 68 103 204 103 99 0 120 3 145 20 41 27 86 93 86 125 0 40 134 140 189 140 5 0 22 6 38 14 15 8 67 33 114 57 l86 42 89 -28 c49 -15 103 -33 119 -40 17 -7 44 -16 61 -19 36 -8 68 -38 92 -87 42 -82 130 -116 274 -105 110 9 176 -15 205 -73 35 -69 53 -64 53 16 0 59 -13 87 -69 146 -26 29 -56 66 -65 84 -40 80 -78 92 -261 82 -56 -3 -67 1 -163 50 -107 56 -118 71 -61 83 19 3 66 16 104 28 39 12 94 26 124 31 29 5 62 14 72 19 10 6 28 10 40 10 12 0 45 7 73 15 28 8 96 25 151 39 55 13 133 34 174 46 71 20 74 20 94 3 18 -15 83 -74 121 -108 116 -107 167 -116 222 -42 28 39 153 244 168 277 4 8 12 24 19 35 7 11 27 47 46 80 319 563 712 736 711 313 -1 -331 -251 -686 -666 -945 -94 -59 -178 -76 -300 -62 -234 28 -343 -66 -225 -194 37 -40 75 -59 194 -97 156 -49 359 28 497 190 82 95 205 -10 139 -119 -102 -168 -328 -320 -522 -352 -196 -32 -249 -78 -181 -159 136 -161 441 -116 665 100 131 126 148 140 174 140 49 0 59 -106 19 -195 -21 -48 -54 -117 -72 -150 -58 -108 -175 -179 -330 -200 -121 -16 -142 -28 -142 -87 0 -46 86 -142 138 -154 15 -4 33 -11 40 -17 24 -19 133 -11 187 13 96 44 212 181 297 352 64 128 104 155 152 103 117 -126 33 -394 -194 -623 -91 -92 -91 -92 -72 -119 11 -16 40 -59 64 -98 25 -38 62 -96 84 -128 21 -32 46 -69 54 -82 8 -13 67 -102 131 -197 64 -95 142 -212 173 -260 57 -90 82 -106 101 -69 27 53 67 114 286 443 246 369 269 404 269 418 0 7 -40 52 -89 100 -185 182 -272 389 -226 540 44 147 112 133 196 -40 23 -47 45 -87 48 -90 3 -3 23 -30 44 -61 158 -235 388 -280 532 -104 77 94 40 145 -118 163 -51 6 -105 17 -122 26 -16 9 -36 16 -43 16 -70 0 -241 274 -249 400 -9 131 34 132 170 2 112 -107 180 -159 237 -182 14 -6 32 -14 41 -19 59 -34 180 -48 256 -30 223 53 274 208 77 234 -238 32 -344 85 -510 257 -123 127 -146 187 -92 238 50 47 85 36 188 -57 173 -156 288 -191 461 -138 326 100 300 322 -33 287 -173 -18 -205 -8 -410 126 -215 141 -370 315 -479 538 -32 67 -59 128 -59 135 0 8 -7 32 -15 54 -39 109 -14 297 48 352 105 94 209 42 452 -227 45 -50 138 -185 175 -255 6 -11 19 -33 30 -50 11 -16 23 -37 27 -45 4 -8 26 -48 50 -88 24 -41 43 -76 43 -78 0 -3 9 -17 19 -32 10 -15 39 -59 65 -98 74 -117 101 -114 263 32 130 118 89 112 323 47 52 -14 108 -27 225 -53 28 -6 70 -17 95 -25 25 -7 61 -16 80 -19 19 -3 67 -15 105 -26 39 -12 85 -25 104 -28 56 -11 46 -26 -51 -76 -125 -65 -140 -69 -219 -55 -102 18 -219 -29 -219 -87 0 -7 -27 -43 -60 -80 -66 -73 -73 -88 -68 -160 3 -51 29 -71 37 -29 14 74 76 98 252 99 148 1 184 18 240 110 37 59 52 72 94 82 16 4 43 12 60 19 168 69 200 72 295 24 47 -23 99 -48 115 -55 158 -64 225 -112 225 -160 0 -91 80 -139 232 -139 127 0 166 -19 198 -94 48 -116 65 13 19 143 -10 31 -19 60 -19 65 0 25 -54 120 -86 154 -70 71 -210 100 -324 66 -34 -10 -42 -9 -69 11 -18 12 -53 34 -80 48 -120 67 -116 82 19 82 47 0 126 5 175 10 174 18 206 16 255 -16 78 -51 215 -44 337 18 85 42 96 45 130 36 83 -21 83 -21 83 -4 0 28 -56 70 -117 91 -32 10 -71 30 -88 45 -119 106 -240 97 -376 -25 -37 -33 -37 -33 -210 -40 -253 -12 -292 -12 -296 1 -4 13 -7 10 107 114 117 106 115 105 160 91 122 -36 236 8 302 118 40 67 100 108 176 120 45 8 50 23 15 47 -35 23 -157 26 -221 5 -35 -12 -50 -12 -77 -2 -108 39 -178 11 -229 -92 -38 -77 -442 -367 -491 -352 -11 4 -45 13 -75 22 -30 8 -80 21 -110 30 -30 8 -80 21 -110 29 -128 31 -147 36 -180 47 -19 5 -51 14 -70 17 -19 4 -71 18 -115 30 -44 12 -102 27 -129 34 -82 19 -80 29 28 140 121 123 123 183 7 201 -20 3 -50 10 -67 15 -16 6 -50 14 -75 19 -134 28 -346 129 -459 219 -163 131 -297 337 -374 576 -67 206 79 288 165 94 169 -381 403 -591 555 -498 67 42 59 66 -60 174 -73 66 -146 153 -146 172 0 4 -6 20 -14 37 -82 182 -73 290 27 332 84 35 134 -19 188 -205 90 -311 177 -447 374 -588 126 -90 217 -112 302 -71 123 59 124 180 1 241 -18 9 -53 26 -78 38 -243 118 -360 285 -360 515 0 207 78 201 286 -22 70 -76 131 -140 134 -143 3 -3 45 -50 95 -105 211 -235 520 -546 568 -570 20 -11 37 -23 37 -27 0 -5 5 -8 11 -8 7 0 30 -8 53 -19 268 -122 617 -15 666 205 26 113 -27 148 -225 146 -276 -3 -434 45 -628 192 -255 192 -557 599 -559 755 -1 114 55 88 227 -104 475 -531 1205 -666 1209 -223 1 115 -68 145 -213 94 -60 -22 -291 -22 -351 -1 -23 8 -51 15 -62 15 -110 0 -422 224 -614 441 -233 263 -172 470 81 275 97 -75 224 -162 270 -186 11 -6 34 -19 50 -30 33 -20 130 -69 210 -105 281 -123 526 -86 605 92 68 153 -10 263 -177 249 -233 -19 -256 -19 -361 3 -57 12 -111 25 -120 30 -9 5 -53 26 -96 47 -98 46 -273 166 -352 239 -6 5 -35 30 -65 55 -113 94 -138 135 -124 200 12 53 51 43 227 -61 27 -16 51 -29 53 -29 3 0 33 -13 67 -29 345 -160 773 -186 905 -54 180 180 9 393 -223 276 -172 -86 -357 -92 -531 -17 -17 8 -35 14 -39 14 -35 0 -403 214 -458 267 -61 59 -71 119 -27 164 40 40 67 37 175 -15 121 -59 161 -76 178 -76 7 0 22 -7 32 -15 11 -8 28 -15 39 -15 11 0 40 -6 66 -14 267 -83 523 -60 683 61 195 148 251 453 81 453 -57 0 -70 -6 -163 -75 -236 -176 -462 -214 -720 -120 -220 79 -370 191 -370 276 0 76 31 81 265 42 589 -98 1081 122 1080 484 -1 182 -132 194 -328 30 -80 -67 -234 -151 -297 -163 -19 -4 -44 -11 -54 -17 -32 -16 -251 -37 -392 -37 -181 0 -254 41 -254 143 0 85 54 118 205 127 61 3 133 12 160 19 96 25 190 54 200 62 5 5 15 9 23 9 34 0 314 141 408 206 152 105 257 220 309 339 15 33 32 71 38 84 42 87 -8 275 -87 329 -84 57 -141 30 -231 -108 -59 -91 -233 -282 -315 -345 -43 -34 -124 -91 -140 -98 -8 -4 -28 -16 -45 -26 -135 -86 -476 -206 -532 -187 -10 4 -31 24 -48 46 -63 82 -100 81 -295 -8 -19 -8 -48 -21 -65 -28 -32 -14 -121 -53 -195 -86 -37 -16 -380 -186 -478 -237 -77 -39 -94 -130 -45 -239 52 -116 6 -348 -87 -439 -107 -106 -308 -106 -418 -1 -150 145 -128 508 41 683 7 7 28 31 47 55 40 49 185 178 215 191 11 5 34 18 50 28 85 55 216 102 400 146 39 9 95 22 125 30 30 7 91 20 135 30 162 36 233 65 283 116 58 59 36 64 -98 19 -129 -43 -250 -31 -306 31 -25 28 -29 27 221 32 173 4 242 9 280 21 28 9 60 16 71 16 141 1 323 245 216 289 -42 18 -74 0 -172 -99 -118 -118 -232 -160 -437 -160 -155 0 -166 22 -53 105 117 86 234 97 286 27 21 -29 37 -3 32 54 -9 109 -115 162 -297 150 -93 -7 -102 -6 -107 11 -15 40 -63 69 -180 107 -57 18 -268 23 -278 7 -4 -5 -25 -12 -48 -16 -23 -4 -71 -18 -107 -32 -203 -75 -398 -124 -555 -139 -136 -12 -125 -40 57 -154 73 -46 72 -61 -5 -100 -142 -72 -312 -230 -281 -261 4 -4 53 -10 108 -11 117 -3 121 -13 20 -46 -38 -12 -79 -26 -90 -31 -11 -5 -39 -17 -63 -27 -123 -51 -201 -144 -121 -144 90 0 88 -34 -9 -134 -42 -45 -109 -116 -149 -158 -90 -98 -91 -98 -189 10 -43 48 -111 120 -151 160 -40 40 -73 77 -73 82 0 17 44 40 77 40 127 0 -50 130 -277 204 -99 32 -95 40 27 46 56 3 105 8 109 12 29 30 -246 268 -311 268 -25 0 -49 43 -30 55 9 6 46 31 83 57 159 113 160 119 17 133 -159 16 -444 90 -582 151 -17 8 -42 14 -55 14 -12 0 -36 7 -52 15 -38 20 -238 20 -281 0z m308 -251 c74 -38 84 -64 38 -108 -92 -89 -408 -17 -326 74 46 51 215 71 288 34z m2827 -4 c134 -69 0 -166 -192 -140 -130 18 -157 90 -53 144 46 24 194 22 245 -4z';
  const EAGLE_SYMBOL =
    `<symbol id="al-eagle" viewBox="0 0 814 872"><path transform="translate(0.000000,872.000000) scale(0.100000,-0.100000)" d="${EAGLE_D}"/></symbol>`;
  const EAGLE = svg('0 0 814 872', '<use href="#al-eagle"/>', 'stroke="none" fill="currentColor"');

  // A flag waving from a pole: outlined cloth with the eagle at its centre
  const FLAG_BODY = `
    <path d="M4 3V63" stroke-width="1.6"/>
    <circle cx="4" cy="2.4" r="1.9" fill="currentColor" stroke="none"/>
    <path d="M5 6C18 2 30 12 45 7V34C30 39 18 29 5 33Z" stroke-width="1.3"/>
    <use href="#al-eagle" x="15.5" y="9.5" width="19" height="20" fill="currentColor" stroke="none"/>`;
  const FLAG = svg('0 0 60 64', FLAG_BODY);

  // Kilim (Albanian woven carpet) motifs, built on a weaving grid: each
  // filled cell is a square, merged into horizontal runs.
  function cells(rows, unit) {
    let d = '';
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== '#') continue;
        let w = 1;
        while (row[x + w] === '#') w++;
        d += `M${x * unit} ${y * unit}h${w * unit}v${unit}h${-w * unit}Z`;
        x += w - 1;
      }
    });
    return d;
  }

  // Corner band: a stepped sawtooth edge above a row of hourglass motifs
  // strung on a thread, as along the kilim's borders.
  function kilimBand() {
    const W = 120, rows = Array.from({ length: 18 }, () => Array(W).fill('.'));
    const run = (x0, x1, y) => { for (let x = x0; x <= x1; x++) if (x >= 0 && x < W) rows[y][x] = '#'; };
    run(0, W - 1, 0);
    for (let t = 0; t < W; t += 8) {                    // stepped teeth
      run(t, t + 6, 1); run(t + 1, t + 5, 2); run(t + 2, t + 4, 3); run(t + 3, t + 3, 4);
    }
    run(0, W - 1, 12);                                  // thread
    for (let c = 6; c + 4 < W; c += 14) {               // whole hourglasses only
      // the two halves sit either side of the thread (row 12)
      [4, 3, 2, 1, 1, 2, 3, 4].forEach((half, i) => run(c - half, c + half, 8 + i + (i > 3 ? 1 : 0)));
    }
    return svg(`0 0 ${W * 2} 36`, `<path d="${cells(rows.map(r => r.join('')), 2)}"/>`, 'stroke="none" fill="currentColor"');
  }

  // Medallion, like the carpet's: a solid stepped block with a hooked
  // ram's-horn ring and a diamond core woven out of it, comb fringes off
  // the side points.
  function kilimMedallion() {
    const W = 41, H = 17, cx = 20, cy = 8, rows = [];
    for (let y = 0; y < H; y++) {
      let row = '';
      for (let x = 0; x < W; x++) {
        const dx = Math.abs(x - cx), dy = Math.abs(y - cy), d = dx + 2 * dy;
        const block = d <= 16;
        const hooks = d >= 8 && d <= 10 && dx >= 2 && dy >= 1;          // broken ring → four hooks
        const horns = (dy === 0 && dx >= 6 && dx <= 10);                // horn stems on the axis
        const halo  = d >= 4.5 && d <= 5.5;                             // gap round the core
        const comb  = dx >= 17 && dx <= 20 && dy % 2 === 0 && dy <= 4;
        row += (block && !hooks && !horns && !halo) || comb ? '#' : '.';
      }
      rows.push(row);
    }
    return svg(`0 0 ${W * 2} ${H * 2}`, `<path d="${cells(rows, 2)}"/>`, 'stroke="none" fill="currentColor"');
  }

  // ── Christmas ─────────────────────────────────────────────
  const f1 = n => n.toFixed(1);

  // Baubles hanging from the top edge on strings of different lengths
  function bauble(x, len, r, kind) {
    const cy = len + r + 4;
    let deco = '';
    if (kind === 'bands') deco = `<path d="M${x - r + 1.5} ${cy - 3}Q${x} ${cy - 0.5} ${x + r - 1.5} ${cy - 3}M${x - r + 1.5} ${cy + 3}Q${x} ${cy + 5.5} ${x + r - 1.5} ${cy + 3}" stroke-width="1"/>`;
    if (kind === 'zigzag') {
      let z = `M${x - r + 1} ${cy}`;
      for (let i = 1; i <= 6; i++) z += `L${f1(x - r + 1 + i * (2 * r - 2) / 6)} ${cy + (i % 2 ? -3 : 0)}`;
      deco = `<path d="${z}" stroke-width="1"/>`;
    }
    if (kind === 'shine') deco = `<path d="M${f1(x - r * 0.55)} ${f1(cy - r * 0.15)}A${r * 0.6} ${r * 0.6} 0 0 1 ${f1(x - r * 0.1)} ${f1(cy - r * 0.6)}" stroke-width="1"/>`;
    const body = kind === 'drop'
      ? `<path d="M${x} ${len + 4}C${x + r} ${len + 4 + r} ${x + r} ${len + 4 + r * 2.2} ${x} ${len + 4 + r * 2.6}C${x - r} ${len + 4 + r * 2.2} ${x - r} ${len + 4 + r} ${x} ${len + 4}Z" stroke-width="1.3"/>
         <path d="M${x} ${len + 4 + r * 0.8}V${len + 4 + r * 2}" stroke-width="1"/>`
      : `<circle cx="${x}" cy="${cy}" r="${r}" stroke-width="1.3"/>${deco}`;
    return `<path d="M${x} 0V${len}" stroke-width="0.8"/>
      <rect x="${x - 3}" y="${len}" width="6" height="4" rx="0.8" fill="currentColor" stroke="none"/>${body}`;
  }
  const HANGING_STAR = (x, len) =>
    `<path d="M${x} 0V${len}" stroke-width="0.8"/>${star(x, len + 9, 9, 'stroke-width="1.2"')}`;
  function star(cx, cy, R, attrs) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.45 : R;
      d += `${i ? 'L' : 'M'}${f1(cx + r * Math.cos(a))} ${f1(cy + r * Math.sin(a))}`;
    }
    return `<path d="${d}Z" ${attrs}/>`;
  }
  const ORNAMENTS = svg('0 0 130 140',
    bauble(22, 46, 11, 'bands') + HANGING_STAR(50, 22) + bauble(76, 74, 14, 'zigzag') + bauble(108, 30, 9, 'drop'));
  const ORNAMENTS_SM = svg('0 0 90 110', bauble(20, 26, 10, 'shine') + bauble(52, 54, 12, 'bands') + HANGING_STAR(78, 14));

  // Pine bough sweeping in from the top-left corner: two branches with
  // needles along both sides, shortening towards the tips, and berries.
  function bough() {
    const branch = (P0, C, P1, n, len) => {
      const at = t => [0, 1].map(k => (1 - t) ** 2 * P0[k] + 2 * (1 - t) * t * C[k] + t * t * P1[k]);
      let d = `M${P0}Q${C} ${P1}`;
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1), [x, y] = at(t), [x2, y2] = at(Math.min(1, t + 0.02));
        const a = Math.atan2(y2 - y, x2 - x), l = len * (1 - t * 0.55);
        for (const side of [-1, 1]) {
          const b = a + side * 0.8;
          d += `M${f1(x)} ${f1(y)}l${f1(l * Math.cos(b))} ${f1(l * Math.sin(b))}`;
        }
      }
      return d;
    };
    const d = branch([0, 14], [60, 6], [138, 40], 16, 13) + branch([12, 0], [22, 60], [52, 132], 14, 12)
            + branch([40, 22], [62, 46], [70, 84], 8, 9);
    return svg('0 0 140 140', `<path d="${d}" stroke-width="1.1"/>
      <g fill="currentColor" stroke="none"><circle cx="26" cy="26" r="4"/><circle cx="34" cy="22" r="3.4"/><circle cx="31" cy="31" r="3"/></g>`);
  }

  function snowflake() {
    let d = '';
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
      const p = (r, da = 0) => `${f1(12 + r * Math.cos(a + da))} ${f1(12 + r * Math.sin(a + da))}`;
      d += `M12 12L${p(11)}M${p(6)}L${p(8.6, 0.42)}M${p(6)}L${p(8.6, -0.42)}`;
    }
    return svg('0 0 24 24', `<path d="${d}" stroke-width="1.1"/>`);
  }

  const HOLLY = svg('0 0 64 40', `
    <g stroke-width="1.2">
      <path d="M30 24Q26 15 21 16Q20 10 14 12Q12 6 4 7Q7 12 5 16Q11 16 11 21Q17 20 18 25Q24 23 30 24Z"/>
      <path d="M30 24Q16 15 6 9" stroke-width="0.8"/>
      <path d="M34 24Q38 15 43 16Q44 10 50 12Q52 6 60 7Q57 12 59 16Q53 16 53 21Q47 20 46 25Q40 23 34 24Z"/>
      <path d="M34 24Q48 15 58 9" stroke-width="0.8"/>
    </g>
    <g fill="currentColor" stroke="none"><circle cx="32" cy="27" r="3.4"/><circle cx="27.5" cy="31" r="3"/><circle cx="36.5" cy="31" r="3"/></g>`);

  const TREE = svg('0 0 40 58', `
    <path d="M20 9L11 21H15L7 33H12L4 46H36L28 33H33L25 21H29Z" stroke-width="1.2"/>
    <path d="M17 46V53H23V46" stroke-width="1.2"/>
    ${star(20, 6, 5, 'fill="currentColor" stroke="none"')}
    <g fill="currentColor" stroke="none"><circle cx="17" cy="27" r="1.3"/><circle cx="24" cy="38" r="1.3"/><circle cx="14" cy="40" r="1.3"/><circle cx="22" cy="17" r="1.1"/></g>`);

  // Shared <symbol>s a theme's decorations <use>, added to the page once
  const SPRITES = { independence: EAGLE_SYMBOL };

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
      ['.hero',        'deco--kilim deco--tl',                  kilimBand()],
      ['.hero',        'deco--kilim deco--tr',                  kilimBand()],
      ['.hero',        'deco--eagle deco--bl',                  EAGLE],
      ['.hero',        'deco--medallion deco--br',              kilimMedallion()],
      ['.ps-pin',      'deco--flag deco--tl',                   FLAG],
      ['.ps-pin',      'deco--eagle deco--eagle-sm deco--br',   EAGLE],
      ['.ps-pin',      'deco--kilim deco--bl',                  kilimBand()],
      ['.booking',     'deco--eagle deco--tr',                  EAGLE],
      ['.booking',     'deco--date deco--tl',                   DATE_MARK],
      ['.booking',     'deco--medallion deco--bl',              kilimMedallion()],
      ['.booking',     'deco--kilim deco--br',                  kilimBand()],
      ['.site-footer', 'deco--kilim deco--light deco--tl',      kilimBand()],
      ['.site-footer', 'deco--kilim deco--light deco--tr',      kilimBand()],
      ['.site-footer', 'deco--eagle deco--light deco--bl',      EAGLE],
      ['.site-footer', 'deco--eagle deco--light deco--br',      EAGLE],
    ],
    christmas: () => [
      ['.hero',        'deco--bough deco--tl',                  bough()],
      ['.hero',        'deco--ornaments deco--tr',              ORNAMENTS],
      ['.hero',        'deco--flake deco--flake1',              snowflake()],
      ['.hero',        'deco--flake deco--flake2',              snowflake()],
      ['.hero',        'deco--flake deco--flake3',              snowflake()],
      ['.hero',        'deco--holly deco--br',                  HOLLY],
      ['.ps-pin',      'deco--holly deco--tl',                  HOLLY],
      ['.ps-pin',      'deco--flake deco--flake4',              snowflake()],
      ['.booking',     'deco--ornaments deco--ornaments-sm deco--tl', ORNAMENTS_SM],
      ['.booking',     'deco--bough deco--bough-sm deco--tr',   bough()],
      ['.booking',     'deco--flake deco--flake5',              snowflake()],
      ['.site-footer', 'deco--bough deco--bough-sm deco--light deco--tl', bough()],
      ['.site-footer', 'deco--bough deco--bough-sm deco--light deco--tr', bough()],
      ['.site-footer', 'deco--tree deco--light deco--bl',       TREE],
      ['.site-footer', 'deco--tree deco--light deco--br',       TREE],
    ],
  };

  function apply(theme) {
    if (!THEMES[theme]) return;
    if (SPRITES[theme]) {
      document.body.insertAdjacentHTML('beforeend',
        `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${SPRITES[theme]}</svg>`);
    }
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
