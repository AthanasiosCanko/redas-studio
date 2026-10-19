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

  // Two-tone fill used by the kilim pieces and the Christmas icons: a soft
  // wash of the line colour under crisp outlines
  const TONE = 'fill="currentColor" fill-opacity="0.22"';
  const SOLID = 'fill="currentColor" stroke="none"';
  const f1 = n => +n.toFixed(1);

  // ── Kilim, drawn as vectors ──────────────────────────────
  // One border band (along the top edge, 30 deep): solid teeth on the
  // outer edge, counter-teeth on the inner edge, and hourglass spindles
  // strung on a thread between them.
  function kilimBandBody(from, to) {
    let d = '', sp = '';
    for (let x = from; x + 12 <= to; x += 12) {
      d += `M${x} 0H${x + 12}L${x + 6} 8ZM${x} 30H${x + 12}L${x + 6} 23Z`;
    }
    for (let c = from + 12; c + 6 <= to; c += 24) {
      sp += `M${c - 5} 9.5H${c + 5}L${c + 1.4} 15L${c + 5} 20.5H${c - 5}L${c - 1.4} 15Z`;
    }
    return `<path d="${d}" ${SOLID}/>
      <path d="M${from} 15H${to}" stroke-width="0.9"/>
      <path d="${sp}" ${TONE} stroke-width="1.1"/>`;
  }
  // Carpet-border corner: the band along the top and (mirrored across the
  // diagonal) down the left, meeting in a framed diamond.
  const KILIM_CORNER = svg('0 0 200 200', `
    ${kilimBandBody(30, 200)}
    <g transform="matrix(0 1 1 0 0 0)">${kilimBandBody(30, 200)}</g>
    <rect x="0.6" y="0.6" width="28.8" height="28.8" stroke-width="1.2"/>
    <path d="M15 4L26 15L15 26L4 15Z" ${TONE} stroke-width="1.2"/>
    <path d="M15 10L20 15L15 20L10 15Z" ${SOLID}/>`);
  const KILIM_STRIP = svg('0 0 200 30', kilimBandBody(0, 200));

  // ── Christmas ─────────────────────────────────────────────
  function star(cx, cy, R, attrs) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? R * 0.45 : R;
      d += `${i ? 'L' : 'M'}${f1(cx + r * Math.cos(a))} ${f1(cy + r * Math.sin(a))}`;
    }
    return `<path d="${d}Z" ${attrs}/>`;
  }

  // Six-armed snowflake path centred on (cx, cy), radius R, in one of
  // three designs
  function flakePath(cx, cy, R, design) {
    let d = '';
    const p = (r, a) => `${f1(cx + r * Math.cos(a))} ${f1(cy + r * Math.sin(a))}`;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      d += `M${p(design === 2 ? R * 0.28 : 0, a)}L${p(R, a)}`;
      if (design === 0) {            // two pairs of branches
        for (const [at, len] of [[0.45, 0.3], [0.72, 0.22]]) {
          d += `M${p(R * at, a)}L${p(R * at + R * len, a + 0.55)}M${p(R * at, a)}L${p(R * at + R * len, a - 0.55)}`;
        }
      } else if (design === 1) {     // a small diamond on each arm
        d += `M${p(R * 0.5, a)}L${p(R * 0.65, a + 0.22)}L${p(R * 0.8, a)}L${p(R * 0.65, a - 0.22)}Z`;
        d += `M${p(R * 0.3, a)}L${p(R * 0.42, a + 0.5)}M${p(R * 0.3, a)}L${p(R * 0.42, a - 0.5)}`;
      } else {                       // hexagon core, forked tips
        d += `M${p(R * 0.28, a)}L${p(R * 0.28, a + Math.PI / 3)}`;
        d += `M${p(R * 0.78, a)}L${p(R, a + 0.18)}M${p(R * 0.78, a)}L${p(R, a - 0.18)}`;
      }
    }
    return d;
  }

  // A matching icon set on a 40×40 grid, in the two-tone style: outlines
  // over a soft wash (TONE), with solid accents.
  const leafPair = (x, y) => `<path d="M${x} ${y}C${x - 6} ${y - 3} ${x - 11} ${y - 1} ${x - 14} ${y + 2}C${x - 9} ${y + 3} ${x - 5} ${y + 3} ${x} ${y}ZM${x} ${y}C${x + 6} ${y - 3} ${x + 11} ${y - 1} ${x + 14} ${y + 2}C${x + 9} ${y + 3} ${x + 5} ${y + 3} ${x} ${y}Z" ${TONE}/>`;
  const ICONS = {
    star: `${star(20, 21, 15, `${TONE} stroke-width="1.5"`)}${star(20, 21, 5, SOLID)}`,
    bell: `<path d="M20 9C13 9 11 15 11 21V27L8 31H32L29 27V21C29 15 27 9 20 9Z" ${TONE}/>
      <path d="M11.5 23H28.5"/><circle cx="20" cy="33.5" r="2.4" ${SOLID}/>
      <path d="M20 9C16 4 11 5 13 8C14 10 18 9.5 20 9C22 9.5 26 10 27 8C29 5 24 4 20 9Z" ${TONE}/>`,
    candle: `<rect x="15" y="14" width="10" height="18" rx="1" ${TONE}/>
      <path d="M15 19L25 15.5M15 24L25 20.5M15 29L25 25.5"/>
      <path d="M20 4C23.5 7.5 23 11.5 20 12C17 11.5 16.5 7.5 20 4Z" ${SOLID}/>
      ${leafPair(20, 33)}<circle cx="18" cy="33" r="1.7" ${SOLID}/><circle cx="22" cy="33" r="1.7" ${SOLID}/>`,
    tree: `<path d="M20 5L12 15H16L9 24H14L7 33H33L26 24H31L24 15H28Z" ${TONE}/>
      <path d="M18 33V37H22V33"/>${star(20, 4.5, 3.4, SOLID)}
      <g ${SOLID}><circle cx="18" cy="13" r="1.2"/><circle cx="23" cy="20" r="1.2"/><circle cx="15" cy="27" r="1.2"/><circle cx="25" cy="29" r="1.2"/></g>`,
    cane: `<path d="M25 37V14A6 6 0 0 0 13 14V18" stroke-width="7" stroke-opacity="0.22" stroke-linecap="round"/>
      <path d="M25 37V14A6 6 0 0 0 13 14V18" stroke-width="7" stroke-dasharray="3.2 4" stroke-linecap="butt"/>`,
    gift: `<rect x="8" y="17" width="24" height="17" rx="1" ${TONE}/><rect x="6" y="12" width="28" height="6" rx="1" ${TONE}/>
      <path d="M20 12V34"/><path d="M20 12C16 5 10 7 13 10C15 12 18 12 20 12C22 12 25 12 27 10C30 7 24 5 20 12Z" ${TONE}/>`,
    bauble: `<circle cx="20" cy="23" r="12" ${TONE}/><rect x="17" y="8.5" width="6" height="3.5" rx="0.8" ${SOLID}/>
      <circle cx="20" cy="6.4" r="1.8"/><path d="${flakePath(20, 23, 7, 0)}" stroke-width="1"/>`,
    snowman: `<circle cx="20" cy="28" r="9" ${TONE}/><circle cx="20" cy="14" r="6" ${TONE}/>
      <path d="M13.5 9H26.5M16 9V3H24V9"/><path d="M20 15L25.5 16L20 16.8Z" ${SOLID}/>
      <path d="M14.5 19Q20 22 25.5 19M23 20.5L24.5 26"/>
      <g ${SOLID}><circle cx="18" cy="13" r="0.9"/><circle cx="22" cy="13" r="0.9"/><circle cx="20" cy="26" r="1.1"/><circle cx="20" cy="30.5" r="1.1"/></g>
      <path d="M11.5 26L6 22M28.5 26L34 22" stroke-width="1.2"/>`,
    wreath: `<circle cx="20" cy="19" r="12" stroke-width="7" stroke-opacity="0.22"/>
      <circle cx="20" cy="19" r="15.5" stroke-width="1.1"/><circle cx="20" cy="19" r="8.5" stroke-width="1.1"/>
      <g ${SOLID}><circle cx="9" cy="14" r="1.5"/><circle cx="16" cy="6.5" r="1.5"/><circle cx="27" cy="8" r="1.5"/><circle cx="32" cy="17" r="1.5"/><circle cx="8.5" cy="23" r="1.5"/></g>
      <path d="M20 31C16 27 11 29 13 32C15 34 18 32 20 31C22 32 25 34 27 32C29 29 24 27 20 31Z" ${TONE}/>
      <path d="M20 31L17 38M20 31L23 38"/>`,
    stocking: `<path d="M13 9H27V24C27 31 22 35 15 35C10 35 8 31 11 28L13 26Z" ${TONE}/>
      <rect x="11.5" y="4" width="17" height="6.5" rx="1.5" ${TONE}/><path d="M12 30.5C14.5 29.5 17 31 17.5 34.5"/>`,
    calendar: `<rect x="6" y="9" width="28" height="25" rx="3" ${TONE}/><path d="M6 16H34M13 6V12M27 6V12"/>
      <text x="20" y="30.5" text-anchor="middle" font-family="Montserrat, sans-serif" font-size="11" ${SOLID}>25</text>`,
    reindeer: `<path d="M13 17C13 13 16 11 20 11C24 11 27 13 27 17C27 23 24 30 20 33C16 30 13 23 13 17Z" ${TONE}/>
      <path d="M13 16C9 15 7 17 8 19C10 19 12 18 13 18ZM27 16C31 15 33 17 32 19C30 19 28 18 27 18Z" ${TONE}/>
      <path d="M16 12C14 8 13 5 13 2M14 7L10 5M14.6 9.5L11 9.5M24 12C26 8 27 5 27 2M26 7L30 5M25.4 9.5L29 9.5"/>
      <g ${SOLID}><circle cx="17.5" cy="19" r="1"/><circle cx="22.5" cy="19" r="1"/><circle cx="20" cy="29.5" r="2.4"/></g>`,
    sleigh: `<path d="M8 29H30C33 29 35 24 34 18H26C24 22 20 23 16 23H11C8 23 6 21 6 18C4 21 5 29 8 29Z" ${TONE}/>
      <path d="M4 34H30C34 34 36 31 35 29M10 34V29M26 34V29M34 18C35 15 33 13 31 14"/>
      <rect x="12" y="14" width="9" height="9" rx="1" ${TONE}/><path d="M16.5 14V23M12 18.5H21"/>`,
    cheers: `<g transform="rotate(-14 15 34)"><path d="M11 7H19L18 17C17.6 20 16.2 21 15 21C13.8 21 12.4 20 12 17Z" ${TONE}/><path d="M15 21V32M11.5 32H18.5"/></g>
      <g transform="rotate(14 25 34)"><path d="M21 7H29L28 17C27.6 20 26.2 21 25 21C23.8 21 22.4 20 22 17Z" ${TONE}/><path d="M25 21V32M21.5 32H28.5"/></g>
      <path d="M20 1V4M16.5 2.5L18 4.5M23.5 2.5L22 4.5" stroke-width="1.2"/>`,
    holly: `<path d="M20 22Q17 14 13 15Q12 10 8 11Q6 6 2 8Q4 12 3 15Q7 15 8 19Q12 18 13 22Q17 20 20 22Z" ${TONE}/>
      <path d="M20 22Q23 14 27 15Q28 10 32 11Q34 6 38 8Q36 12 37 15Q33 15 32 19Q28 18 27 22Q23 20 20 22Z" ${TONE}/>
      <path d="M20 22Q11 14 4 10M20 22Q29 14 36 10" stroke-width="0.8"/>
      <g ${SOLID}><circle cx="20" cy="25" r="3"/><circle cx="16" cy="28.5" r="2.7"/><circle cx="24" cy="28.5" r="2.7"/></g>`,
    globe: `<circle cx="20" cy="18" r="13" ${TONE}/><path d="M10 31H30L32 37H8Z" ${TONE}/>
      <path d="M15 25V19L20 14L25 19V25Z"/><path d="M19 25V21H21V25"/>
      <g ${SOLID}><circle cx="13" cy="11" r="1"/><circle cx="27" cy="11" r="1"/><circle cx="11.5" cy="18" r="1"/><circle cx="28.5" cy="19" r="1"/><circle cx="20" cy="8" r="1"/></g>`,
  };
  const icon = name => svg('0 0 40 40', ICONS[name], 'stroke-width="1.5"');

  // Icons hanging from the top edge on strings of different lengths:
  // [x, string length, icon size, icon]
  const hanging = (vb, items) => svg(vb, items.map(([x, len, size, name]) =>
    `<path d="M${x} 0V${len}" stroke-width="0.8"/>
     <g transform="translate(${x - size / 2} ${len - size * 0.12}) scale(${size / 40})" stroke-width="${f1(1.5 * 40 / size)}">${ICONS[name]}</g>`).join(''));

  // A small winter scene on a snow line: snowman, tree and a gift
  const SNOW_SCENE = svg('0 0 160 76', `
    <path d="M0 70Q30 64 60 69T120 67T160 68" stroke-width="1.2"/>
    <g transform="translate(6 18) scale(1.25)" stroke-width="1.2">${ICONS.snowman}</g>
    <g transform="translate(62 6) scale(1.55)" stroke-width="1">${ICONS.tree}</g>
    <g transform="translate(118 32) scale(0.95)" stroke-width="1.5">${ICONS.gift}</g>`);

  // Mistletoe on a ribbon: a bow with forked tails, three stems fanning
  // out, pointed leaves in pairs with midribs, and pearl berries gathered
  // where the stems meet and at their tips.
  function mistletoe() {
    const leaf = (x, y, deg, len, w) => {
      const a = deg * Math.PI / 180, ux = Math.cos(a), uy = Math.sin(a);
      const tx = x + ux * len, ty = y + uy * len, mx = x + ux * len * 0.45, my = y + uy * len * 0.45;
      return `<path d="M${x} ${y}Q${f1(mx - uy * w)} ${f1(my + ux * w)} ${f1(tx)} ${f1(ty)}Q${f1(mx + uy * w)} ${f1(my - ux * w)} ${x} ${y}Z" ${TONE}/>
        <path d="M${x} ${y}L${f1(x + ux * len * 0.8)} ${f1(y + uy * len * 0.8)}" stroke-width="0.6"/>`;
    };
    const berry = (x, y, r = 2.8) => `<circle cx="${x}" cy="${y}" r="${r}" ${TONE}/><circle cx="${f1(x - r * 0.35)}" cy="${f1(y - r * 0.35)}" r="0.7" ${SOLID}/>`;
    return svg('-6 0 92 112', `
      <path d="M40 0V21" stroke-width="0.8"/>
      <g stroke-width="1.1">
        <path d="M40 22C31 10 19 13 21 21C22.5 27 32 26 40 22ZM40 22C49 10 61 13 59 21C57.5 27 48 26 40 22Z" ${TONE}/>
        <path d="M40 23C38 30 35 34 30 39L33 40.5L33.5 37M40 23C42 30 45 34 50 39L47 40.5L46.5 37"/>
        <circle cx="40" cy="22.5" r="2.6" ${SOLID}/>
        <path d="M40 34Q36 48 26 62M40 34Q40 52 40 70M40 34Q44 48 54 62"/>
        ${leaf(34, 46, 150, 22, 7)}${leaf(46, 46, 30, 22, 7)}
        ${leaf(26, 62, 120, 26, 8)}${leaf(26, 62, 165, 24, 7.5)}
        ${leaf(54, 62, 60, 26, 8)}${leaf(54, 62, 15, 24, 7.5)}
        ${leaf(40, 70, 78, 28, 8)}${leaf(40, 70, 102, 28, 8)}
      </g>
      <g stroke-width="0.9">
        ${berry(35.5, 34, 3.4)}${berry(44.5, 34, 3.4)}${berry(40, 39.5, 3.6)}${berry(33, 41, 3.1)}${berry(47, 41, 3.1)}${berry(40, 31, 3)}
        ${berry(26, 62, 3)}${berry(54, 62, 3)}${berry(40, 70, 3)}
      </g>`);
  }
  const MISTLETOE = mistletoe();


  // Geometric tile mosaic (the banner corner): an L of square tiles —
  // four-point stars, crossed petals, quarter circles, rings, diamonds —
  // half of them solid, half at lighter weight for a two-tone feel.
  function mosaic() {
    const T = 20, tiles = {
      star:    `<path d="M10 0A10 10 0 0 0 20 10A10 10 0 0 0 10 20A10 10 0 0 0 0 10A10 10 0 0 0 10 0Z"/>`,
      petals:  `<path d="M1 1Q19 1 19 19Q1 19 1 1ZM19 1Q19 19 1 19Q1 1 19 1Z" fill-rule="nonzero"/>`,
      quarter: `<path d="M0 0H20A20 20 0 0 1 0 20Z"/>`,
      half:    `<path d="M0 20A10 10 0 0 1 20 20Z"/><circle cx="10" cy="6" r="3"/>`,
      holed:   `<path d="M0 0H20V20H0ZM10 4.5A5.5 5.5 0 1 0 10.01 4.5Z" fill-rule="evenodd"/>`,
      diamond: `<path d="M10 1L19 10L10 19L1 10Z"/>`,
      ring:    `<path d="M10 1A9 9 0 1 0 10.01 1ZM10 5.5A4.5 4.5 0 1 1 9.99 5.5Z" fill-rule="evenodd"/>`,
      dot:     `<circle cx="10" cy="10" r="4.5"/>`,
      bars:    `<path d="M3 0H6V20H3ZM8.5 0H11.5V20H8.5ZM14 0H17V20H14Z"/>`,
    };
    const layout = [   // [col, row, tile, solid?]
      [0, 0, 'petals', 0], [1, 0, 'star', 1], [2, 0, 'ring', 0], [3, 0, 'quarter', 1], [4, 0, 'star', 0], [5, 0, 'bars', 1], [6, 0, 'holed', 1],
      [1, 1, 'dot', 1], [2, 1, 'diamond', 0], [3, 1, 'petals', 1], [4, 1, 'half', 0], [5, 1, 'star', 1], [6, 1, 'quarter', 0],
      [3, 2, 'star', 0], [4, 2, 'holed', 0], [5, 2, 'ring', 1], [6, 2, 'diamond', 1],
      [5, 3, 'petals', 0], [6, 3, 'star', 1],
      [6, 4, 'dot', 0], [5, 4, 'quarter', 1],
      [6, 5, 'petals', 1],
    ];
    const body = layout.map(([c, r, t, solid]) =>
      `<g transform="translate(${c * T} ${r * T})" opacity="${solid ? 1 : 0.5}">${tiles[t]}</g>`).join('');
    return svg('0 0 140 120', body, 'stroke="none" fill="currentColor"');
  }

  // The eagle on a heater shield, as on the coat of arms
  const SHIELD_EAGLE = svg('0 0 80 96', `
    <path d="M6 6H74V44C74 70 56 84 40 92C24 84 6 70 6 44Z" stroke-width="2"/>
    <path d="M11 11H69V44C69 66 54 78 40 85C26 78 11 66 11 44Z" stroke-width="0.8"/>
    <use href="#al-eagle" x="17" y="17" width="46" height="50" fill="currentColor" stroke="none"/>`);

  // Çifteli, the two-string lute, with a few notes
  const note = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="2.3" transform="rotate(-20 ${x} ${y})" fill="currentColor" stroke="none"/>
    <path d="M${x + 2.9} ${y - 0.8}V${y - 15}Q${x + 7} ${y - 12} ${x + 8} ${y - 7}" stroke-width="1.1"/>`;
  const CIFTELI = svg('0 0 110 120', `
    <g transform="rotate(32 40 70)" stroke-width="1.3">
      <path d="M40 118C25 118 19 101 25 88C29 80 35 75 37 67H43C45 75 51 80 55 88C61 101 55 118 40 118Z"/>
      <circle cx="40" cy="100" r="3" fill="currentColor" stroke="none"/>
      <path d="M37 67V16H43V67" fill="currentColor"/>
      <path d="M36 16L35 4H45L44 16Z"/>
      <path d="M35 7H31M35 12H31M45 7H49M45 12H49" stroke-width="1.6"/>
      <path d="M39 14V112M41 14V112" stroke-width="0.5"/>
      <path d="M34 110H46" stroke-width="1.6"/>
    </g>
    ${note(84, 34)}${note(98, 62)}
    <ellipse cx="78" cy="78" rx="3.2" ry="2.3" transform="rotate(-20 78 78)" fill="currentColor" stroke="none"/>
    <ellipse cx="90" cy="74" rx="3.2" ry="2.3" transform="rotate(-20 90 74)" fill="currentColor" stroke="none"/>
    <path d="M80.9 77.2V63M92.9 73.2V59M80.9 63L92.9 59M80.9 66L92.9 62" stroke-width="1.1"/>`);

  // Chevron arrows, solid and outlined, in a loose flight
  function chevrons() {
    const chev = (x, y, sz, solid) =>
      `<path d="M${x} ${y}h${sz * 0.45}l${sz * 0.5} ${sz * 0.5}l${-sz * 0.5} ${sz * 0.5}h${-sz * 0.45}l${sz * 0.5} ${-sz * 0.5}Z" ${solid ? 'fill="currentColor" stroke="none"' : 'stroke-width="1.2"'}/>`;
    return svg('0 0 150 90', [
      [4, 6, 18, 0], [34, 4, 22, 1], [70, 8, 16, 0], [96, 6, 18, 0], [118, 6, 18, 1],
      [20, 38, 16, 0], [46, 34, 24, 1], [84, 40, 14, 0], [104, 36, 18, 0],
      [8, 66, 14, 0], [30, 64, 18, 0], [62, 62, 20, 1],
    ].map(c => chev(...c)).join(''));
  }

  // Tirana skyline in the two-tone style, Dajti mountain behind it. Left to
  // right: the pixel tower, a painted façade, the Pyramid, Tanners' Bridge,
  // Et'hem Bey mosque and the Clock Tower, Skanderbeg on horseback, the
  // National History Museum and its mosaic, the Resurrection Cathedral, a
  // twisted tower, a high-rise, another painted block and the Great Mosque.
  const SKYLINE = svg('0 8 800 82', `
    <path d="M0 88V62Q60 44 120 50Q200 30 280 44Q360 18 450 40Q520 26 600 42Q680 28 740 44Q770 40 800 46V88Z" fill="currentColor" fill-opacity="0.09" stroke="none"/>
    <g ${TONE} stroke-width="1.2">
      <path d="M20 88V30H30V22H40V16H48V88Z"/>
      <rect x="54" y="52" width="36" height="36"/>
      <path d="M100 88L124 60H146L170 88Z"/>
      <path d="M232 88V68H270V88Z"/>
      <path d="M274 88V34L276.5 26L279 34V88Z"/>
      <path d="M290 88V24H302V88Z"/>
      <path d="M287.5 30H304.5V33H287.5Z"/>
      <rect x="318" y="72" width="32" height="16"/>
      <path d="M362 88V66H452V88Z"/>
      <path d="M464 88V64H500V88Z"/>
      <path d="M512 88L514 22L534 26L531 88Z"/>
      <path d="M542 88V18L556 10V88Z"/>
      <rect x="568" y="48" width="38" height="40"/>
      <path d="M618 88V62H684V88Z"/>
      <path d="M612 88V32L614.5 24L617 32V88ZM685 88V32L687.5 24L690 32V88Z"/>
      <path d="M700 88V58H740V88ZM746 88V66H792V88Z"/>
    </g>
    <path d="M30 30V88M40 22V88M20 44H48M20 58H48M20 72H48" stroke-width="0.6"/>
    <path d="M54 64L66 52M54 76L78 52M54 88L90 52M66 88L90 64M78 88L90 76" stroke-width="0.7"/>
    <path d="M108 79H162M116 70H154" stroke-width="0.7"/>
    <path d="M178 88Q198 64 218 88M174 80Q198 60 222 80" stroke-width="1.3"/>
    <path d="M241 68A10 10 0 0 1 261 68Z" ${TONE} stroke-width="1.2"/>
    <path d="M251 58V54M238 88V80A3 3 0 0 1 244 80V88M248 88V80A3 3 0 0 1 254 80V88M258 88V80A3 3 0 0 1 264 80V88" stroke-width="0.8"/>
    <path d="M291 24A5 5 0 0 1 301 24ZM296 19V14" ${TONE} stroke-width="1.1"/>
    <circle cx="296" cy="40" r="3.4" stroke-width="0.9"/>
    <path d="M323 72L325 63Q324 58 330 57H341Q344 54 346 50L349 51.5Q348.5 55.5 346 59L345.5 72H343V64H330.5L328.5 72ZM333.5 57V48Q335.5 45 338.5 47.5V57Z" ${SOLID}/>
    <circle cx="336" cy="45" r="2.3" fill="currentColor" stroke="none"/>
    <path d="M385 70H429L424 84H390Z" ${SOLID} opacity="0.55"/>
    <path d="M482 64A16 16 0 0 0 482 64ZM467 64A15 15 0 0 1 497 64Z" ${TONE} stroke-width="1.2"/>
    <path d="M482 49V40M478.5 43H485.5" stroke-width="1.2"/>
    <path d="M514 40L533 44M514.5 58L532 62M515 76L531.5 79" stroke-width="0.7"/>
    <path d="M547 20V88M551 17V88M542 40H556M542 60H556" stroke-width="0.6"/>
    <path d="M568 61H606M568 74H606M581 48V88M594 48V88" stroke-width="0.6"/>
    <path d="M628 62A23 23 0 0 1 674 62Z" ${TONE} stroke-width="1.2"/>
    <path d="M651 39V33" stroke-width="1.2"/>
    <path d="M0 88H800" stroke-width="1.1"/>`);

  // ── Ramadan ───────────────────────────────────────────────
  // Crescent moon with a star, in the two-tone style
  const moonPath = (cx, cy, r) =>
    `M${cx} ${f1(cy - r)}A${r} ${r} 0 1 0 ${cx} ${f1(cy + r)}A${f1(r * 0.8)} ${f1(r * 0.8)} 0 1 1 ${cx} ${f1(cy - r)}Z`;
  const CRESCENT = svg('0 0 150 110', `
    <path d="${moonPath(44, 40, 30)}" ${TONE} stroke-width="1.5"/>
    <path d="${moonPath(118, 76, 12)}" ${TONE} stroke-width="1.2"/>
    ${star(62, 26, 9, `${TONE} stroke-width="1.3"`)}
    ${star(96, 20, 6, `${TONE} stroke-width="1.1"`)}
    ${star(82, 52, 4.5, SOLID)}${star(132, 40, 5, `${TONE} stroke-width="1"`)}
    ${star(24, 92, 5, `${TONE} stroke-width="1"`)}${star(64, 96, 3.5, SOLID)}${star(138, 104, 3.5, SOLID)}
    <g ${SOLID}><circle cx="110" cy="44" r="1.3"/><circle cx="92" cy="86" r="1"/><circle cx="12" cy="66" r="1"/><circle cx="128" cy="10" r="1.2"/></g>`);

  // Fanoos lantern on a 40-wide grid, hung from y=0
  const lanternBody = `
    <circle cx="20" cy="3" r="2.2"/>
    <path d="M13 14L20 6L27 14Z" ${TONE}/>
    <rect x="11.5" y="14" width="17" height="3.5" rx="1" ${TONE}/>
    <path d="M12 17.5H28L31 26V40L28 46H12L9 40V26Z" ${TONE}/>
    <path d="M15.5 41V29.5A4.5 4.5 0 0 1 24.5 29.5V41Z"/>
    <path d="M20 31.5C22 33.5 21.8 36 20 37C18.2 36 18 33.5 20 31.5Z" ${SOLID}/>
    <path d="M9 26H31M9 40H31" stroke-width="0.8"/>
    <path d="M12 46H28L24 51H16Z" ${TONE}/>
    <path d="M20 51V56"/><circle cx="20" cy="57.5" r="1.4" ${SOLID}/>`;
  const hangLantern = (x, len, size) =>
    `<path d="M${x} 0V${len}" stroke-width="0.8"/>
     <g transform="translate(${f1(x - size / 2)} ${len}) scale(${f1(size / 40)})" stroke-width="${f1(1.4 * 40 / size)}">${lanternBody}</g>`;
  const hangStar = (x, len, r) => `<path d="M${x} 0V${len}" stroke-width="0.8"/>${star(x, len + r, r, `${TONE} stroke-width="1.1"`)}`;
  const hangMoon = (x, len, r) => `<path d="M${x} 0V${len}" stroke-width="0.8"/>
    <path d="${moonPath(x, len + r, r)}" ${TONE} stroke-width="1.1"/>`;
  const LANTERNS = svg('0 0 280 170',
    hangStar(10, 22, 7) + hangLantern(40, 44, 34) + hangMoon(72, 16, 9) + hangStar(96, 54, 6)
    + hangLantern(128, 70, 40) + hangMoon(162, 34, 8) + hangStar(186, 18, 5) + hangLantern(214, 30, 30)
    + hangStar(240, 62, 6) + hangMoon(266, 22, 8));
  const LANTERN_ONE = svg('0 0 84 110', hangStar(10, 18, 6) + hangLantern(42, 28, 36) + hangMoon(74, 12, 8));

  // Eight-point star (khatam): two squares, one turned 45°, with inner rings
  const star8 = (cx, cy, r) => {
    const sq = rot => [0, 1, 2, 3].map(i => {
      const a = rot + i * Math.PI / 2;
      return `${i ? 'L' : 'M'}${f1(cx + r * Math.cos(a))} ${f1(cy + r * Math.sin(a))}`;
    }).join('') + 'Z';
    return `<path d="${sq(Math.PI / 4)}${sq(0)}" ${TONE}/>
      <circle cx="${cx}" cy="${cy}" r="${f1(r * 0.52)}"/>
      <circle cx="${cx}" cy="${cy}" r="${f1(r * 0.2)}" ${SOLID}/>`;
  };
  const STAR8 = svg('0 0 110 70', `<g stroke-width="1.4">${star8(76, 34, 26)}</g>
    <path d="${moonPath(26, 30, 14)}" ${TONE} stroke-width="1.3"/>
    ${star(38, 58, 5, `${TONE} stroke-width="1"`)}${star(48, 12, 3.5, SOLID)}
    <circle cx="10" cy="58" r="1.1" ${SOLID}/>`);
  // Corner group (bottom-left; CSS mirrors it): a large eight-point star
  // and two small ones strung along a thin arc
  const ROSETTE = svg('0 0 120 120', `
    <path d="M8 18Q16 104 112 112" stroke-width="0.9"/>
    <g stroke-width="1.3">${star8(36, 84, 24)}${star8(88, 104, 11)}${star8(18, 36, 10)}</g>`);

  // Mosque line for the footer: a central dome over arches, side domes,
  // two tall minarets, on a ground line
  const MOSQUE_LINE = svg('0 0 600 90', `
    <g ${TONE} stroke-width="1.2">
      <path d="M220 88V58H380V88Z"/>
      <path d="M258 58A42 42 0 0 1 342 58Z"/>
      <path d="M190 88V66H220V88ZM380 88V66H410V88Z"/>
      <path d="M190 66A15 15 0 0 1 220 66ZM380 66A15 15 0 0 1 410 66Z"/>
      <path d="M160 88V40L164 30L168 40V88ZM432 88V40L436 30L440 40V88Z"/>
    </g>
    <path d="M300 16V12M205 51V48M395 51V48M164 30V27M436 30V27" stroke-width="1.1"/>
    <g ${TONE} stroke-width="0.9">
      <path d="${moonPath(300, 8, 4)}"/><path d="${moonPath(205, 45, 2.6)}"/><path d="${moonPath(395, 45, 2.6)}"/>
      <path d="${moonPath(164, 24, 2.6)}"/><path d="${moonPath(436, 24, 2.6)}"/>
    </g>
    ${star(232, 32, 3.5, SOLID)}${star(368, 30, 3.5, SOLID)}${star(120, 50, 4, `${TONE} stroke-width="0.9"`)}${star(480, 48, 4, `${TONE} stroke-width="0.9"`)}
    ${star(80, 64, 2.6, SOLID)}${star(520, 62, 2.6, SOLID)}
    <path d="M158 50H170M430 50H442M159 66H169M431 66H441" stroke-width="1.2"/>
    <path d="M236 88V74A6 6 0 0 1 248 74V88M262 88V74A6 6 0 0 1 274 74V88M288 88V72A12 12 0 0 1 312 72V88M326 88V74A6 6 0 0 1 338 74V88M352 88V74A6 6 0 0 1 364 74V88" stroke-width="0.9"/>
    <path d="M40 88V76H120V88M480 88V76H560V88" ${TONE} stroke-width="1"/>
    <path d="M60 76A20 20 0 0 1 100 76M500 76A20 20 0 0 1 540 76" stroke-width="1"/>
    <path d="M0 88H600" stroke-width="1.1"/>`);

  const GREETING = `<span class="deco-date">Ramazan i bekuar</span>`;

  // Shared <symbol>s a theme's decorations <use>, added to the page once
  const SPRITES = { independence: EAGLE_SYMBOL };

  const DATE_MARK = `<span class="deco-date">28 Nëntor 1912</span>`;

  // [container selector, modifier classes, markup, optional inline position]
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
      ['.booking',     'deco--web deco--web-sm deco--tr',       WEB],
      ['.booking',     'deco--spider',                          SPIDER],
      ['.site-footer', 'deco--web deco--web-sm deco--light deco--tl', WEB_TORN],
      ['.site-footer', 'deco--web deco--web-sm deco--light deco--tr', WEB],
      ['.site-footer', 'deco--pumpkin deco--bl',                pumpkin()],
      ['.site-footer', 'deco--pumpkin deco--pumpkin-sm deco--bl2', pumpkin()],
      ['.site-footer', 'deco--pumpkin deco--br',                pumpkin()],
    ],
    independence: () => [
      ['.hero',        'deco--kilim-corner deco--tl',           KILIM_CORNER],
      ['.hero',        'deco--mosaic deco--tr',                 mosaic()],
      ['.hero',        'deco--chevrons deco--bl',               chevrons()],
      ['.hero',        'deco--shield deco--br',                 SHIELD_EAGLE],
      ['.ps-pin',      'deco--flag deco--tl',                   FLAG],
      ['.ps-pin',      'deco--eagle deco--eagle-sm deco--tr',   EAGLE],
      ['.ps-pin',      'deco--kilim-strip deco--bl',            KILIM_STRIP],
      ['.ps-pin',      'deco--kilim-strip deco--br',            KILIM_STRIP],
      ['.booking',     'deco--date deco--tl',                   DATE_MARK],
      ['.booking',     'deco--cifteli deco--tr',                CIFTELI],
      ['.booking',     'deco--kilim-corner deco--kilim-sm deco--bl', KILIM_CORNER],
      ['.booking',     'deco--kilim-corner deco--kilim-sm deco--br', KILIM_CORNER],
      ['.site-footer', 'deco--kilim-corner deco--kilim-sm deco--light deco--tl', KILIM_CORNER],
      ['.site-footer', 'deco--kilim-corner deco--kilim-sm deco--light deco--tr', KILIM_CORNER],
      ['.site-footer', 'deco--skyline deco--light',             SKYLINE],
    ],
    christmas: () => [
      ['.hero',        'deco--wreath deco--tl',                 icon('wreath')],
      ['.hero',        'deco--mistletoe deco--m-hero',          MISTLETOE],
      ['.hero',        'deco--hanging deco--tr',                hanging('0 0 220 160', [
                         [16, 30, 26, 'bauble'], [48, 66, 30, 'bell'], [80, 22, 24, 'star'], [112, 82, 32, 'bauble'],
                         [146, 40, 26, 'cane'], [178, 70, 28, 'star'], [204, 26, 22, 'bauble']])],
      ['.hero',        'deco--scene deco--bl',                  SNOW_SCENE],
      ['.hero',        'deco--icon deco--sleigh deco--br',      icon('sleigh')],
      ['.ps-pin',      'deco--icon deco--tl',                   icon('candle')],
      ['.ps-pin',      'deco--hanging deco--hanging-sm deco--tr', hanging('0 0 120 110', [
                         [16, 26, 24, 'star'], [50, 52, 28, 'bauble'], [86, 20, 22, 'cane'], [108, 44, 20, 'star']])],
      ['.booking',     'deco--icon deco--tl',                   icon('calendar')],
      ['.booking',     'deco--mistletoe deco--m-booking',       MISTLETOE],
      ['.booking',     'deco--icon deco--bl',                   icon('cheers')],
      ['.booking',     'deco--icon deco--br',                   icon('globe')],
      ['.site-footer', 'deco--icon deco--light deco--tl',       icon('holly')],
      ['.site-footer', 'deco--icon deco--light deco--tr',       icon('holly')],
      ['.site-footer', 'deco--icon deco--light deco--bl',       icon('reindeer')],
      ['.site-footer', 'deco--icon deco--light deco--br',       icon('stocking')],
    ],
    ramadan: () => [
      ['.hero',        'deco--crescent deco--tl',               CRESCENT],
      ['.hero',        'deco--lanterns deco--tr',               LANTERNS],
      ['.hero',        'deco--rosette deco--bl',                ROSETTE],
      ['.hero',        'deco--rosette deco--br',                ROSETTE],
      ['.ps-pin',      'deco--lantern deco--tl',                LANTERN_ONE],
      ['.ps-pin',      'deco--lantern deco--tr',                LANTERN_ONE],
      ['.booking',     'deco--date deco--tl',                   GREETING],
      ['.booking',     'deco--star8 deco--tr',                  STAR8],
      ['.booking',     'deco--rosette deco--rosette-sm deco--bl', ROSETTE],
      ['.booking',     'deco--rosette deco--rosette-sm deco--br', ROSETTE],
      ['.site-footer', 'deco--rosette deco--rosette-sm deco--light deco--tl', ROSETTE],
      ['.site-footer', 'deco--rosette deco--rosette-sm deco--light deco--tr', ROSETTE],
      ['.site-footer', 'deco--mosque deco--light',              MOSQUE_LINE],
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
    for (const [selector, classes, markup, style] of decos) {
      const host = document.querySelector(selector);
      if (!host) continue;
      const el = document.createElement('div');
      el.className = `deco ${classes}`;
      el.setAttribute('aria-hidden', 'true');
      if (style) el.style.cssText = style;   // scattered pieces place themselves
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
