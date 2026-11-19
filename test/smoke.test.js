'use strict';

/**
 * Dependency-free smoke tests — no DB, no network, no browser.
 * Guards against the failures that actually break this static site:
 * syntax errors, malformed JSON, and front-end ↔ back-end contract drift
 * (DOM ids the scripts query, API paths, the booking-time rules).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const JS_FILES = ['server.js', 'booking.js', 'admin.js', 'calendar.js', 'themes.js', 'sw.js', 'timepicker.js', 'hero.js', 'sq.js', 'services.js'];
const JSON_FILES = ['package.json', 'manifest.json', 'manifest-admin.json'];

test('all JS files parse (node --check)', () => {
  for (const file of JS_FILES) {
    assert.doesNotThrow(
      () => execFileSync(process.execPath, ['--check', path.join(root, file)]),
      `${file} has a syntax error`
    );
  }
});

test('all JSON files are valid', () => {
  for (const file of JSON_FILES) {
    assert.doesNotThrow(() => JSON.parse(read(file)), `${file} is not valid JSON`);
  }
});

test('manifests point at the correct start URLs', () => {
  assert.equal(JSON.parse(read('manifest.json')).start_url, '/');
  assert.equal(JSON.parse(read('manifest-admin.json')).start_url, '/admin');
});

test('index.html exposes every DOM hook booking.js relies on', () => {
  const html = read('index.html');
  for (const id of [
    'cal-prev', 'cal-next', 'cal-month-label', 'cal-grid',
    'slots-wrap', 'slots-date-label', 'time-picker', 'choose-time-btn',
    'bk-overlay', 'bk-close', 'bk-form', 'bk-name', 'bk-phone', 'bk-success',
  ]) {
    assert.ok(html.includes(`id="${id}"`), `index.html missing #${id}`);
  }
});

test('admin.html exposes every DOM hook admin.js relies on', () => {
  const html = read('admin.html');
  for (const id of [
    'login-screen', 'login-form', 'login-pw', 'login-error',
    'dashboard', 'logout-btn', 'bookings-list',
    'adm-cal-prev', 'adm-cal-next', 'adm-cal-month', 'adm-cal-grid',
    'day-panel', 'day-panel-title', 'adm-block-day-btn', 'day-panel-bookings', 'adm-add-booking',
    'adm-bk-overlay', 'adm-bk-form', 'adm-time-picker', 'adm-bk-name', 'adm-bk-email', 'adm-bk-phone',
  ]) {
    assert.ok(html.includes(`id="${id}"`), `admin.html missing #${id}`);
  }
});

test('service-worker precache lists only files that exist', () => {
  const sw = read('sw.js');
  const match = sw.match(/const PRECACHE = \[([\s\S]*?)\]/);
  assert.ok(match, 'PRECACHE array not found in sw.js');
  const entries = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(entries.length > 0, 'PRECACHE is empty');
  for (const url of entries) {
    if (url === '/') continue; // served by Express, not a file on disk
    assert.ok(fs.existsSync(path.join(root, url)), `PRECACHE references missing file: ${url}`);
  }
});

test('server enforces the 09:00–20:00 / 5-minute booking window', () => {
  const server = read('server.js');
  assert.ok(/BOOK_START_MIN\s*=\s*9\s*\*\s*60/.test(server), 'BOOK_START_MIN must be 09:00');
  assert.ok(/BOOK_END_MIN\s*=\s*20\s*\*\s*60/.test(server), 'BOOK_END_MIN must be 20:00');
  assert.ok(/SLOT_STEP_MIN\s*=\s*5/.test(server), 'SLOT_STEP_MIN must be 5');
  assert.ok(server.includes('function isValidTime'), 'server must validate the time format/range');
});

test('booking status transitions cover accept, deny and cancel', () => {
  const server = read('server.js');
  for (const action of ['accept', 'deny', 'cancel']) {
    assert.ok(server.includes(`${action}:`), `STATUS_TRANSITIONS missing "${action}"`);
  }
  assert.ok(server.includes("'/api/admin/bookings/status'"), 'status endpoint missing');
});

test('client emails cover all four booking events', () => {
  const server = read('server.js');
  assert.ok(server.includes('nodemailer'), 'email must use nodemailer (Gmail SMTP)');
  for (const kind of ['received', 'accepted', 'denied', 'cancelled']) {
    assert.ok(server.includes(`${kind}:`), `bookingEmail COPY missing "${kind}"`);
  }
  assert.ok(server.includes("notifyClient('received'"), 'request-received SMS/email not wired');
  assert.ok(/function notifyClient[\s\S]*?bookingEmail\(kind/.test(server), 'notifyClient must send the email');
});

test('the time picker exposes RedaTimePicker.create', () => {
  const tp = read('timepicker.js');
  assert.ok(tp.includes('window.RedaTimePicker'), 'timepicker must attach RedaTimePicker to window');
  assert.ok(/create\s*\(/.test(tp), 'timepicker must expose a create()');
});

test('both pages load calendar.js before the script that uses it', () => {
  for (const [page, script] of [['index.html', 'booking.js'], ['admin.html', 'admin.js']]) {
    const html = read(page);
    const at = (src) => html.indexOf(`<script src="${src}">`);
    assert.ok(at('calendar.js') > -1, `${page} must load calendar.js`);
    assert.ok(at('calendar.js') < at(script), `${page} must load calendar.js before ${script}`);
  }
});

test('shared calendar helpers: Albanian labels, month roll-over, first free time', () => {
  const window = {};
  new Function('window', read('calendar.js'))(window);
  const { formatDate, shiftMonth, firstFreeTime } = window.RedaCalendar;

  assert.equal(formatDate('2026-10-09'), 'E premte, 9 tetor');
  assert.equal(formatDate('2026-12-30', { year: true }), 'E mërkurë, 30 dhjetor 2026');
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
  // A far-future day ignores the clock: first 5-minute step not already taken
  assert.equal(firstFreeTime('2099-01-05', new Set()), '09:00');
  assert.equal(firstFreeTime('2099-01-05', new Set(['09:00', '09:05'])), '09:10');
});

test('seasonal theme: admin picker, guarded save route, public loader', () => {
  const server = read('server.js'), admin = read('admin.html'), index = read('index.html');
  assert.ok(server.includes("app.get('/api/theme'"), 'public theme read route missing');
  assert.ok(server.includes("app.post('/api/admin/theme', requireAdmin"), 'theme save must require admin');
  for (const v of ['none', 'halloween']) assert.ok(admin.includes(`value="${v}"`), `admin radio "${v}" missing`);
  assert.ok(index.includes('<script src="themes.js">') && index.includes('href="themes.css"'), 'index must load themes.js/css');
  // every theme the server accepts (except none) must have decorations
  const themes = server.match(/const THEMES = \[([^\]]*)\]/)[1].match(/'([^']+)'/g).map(t => t.slice(1, -1));
  for (const t of themes.filter(t => t !== 'none')) assert.ok(new RegExp(`\\b${t}: (\\(\\) => )?\\[`).test(read('themes.js')), `themes.js has no ${t} decorations`);
});

test('only public files are served, and admin secrets have no fallback', () => {
  const server = read('server.js');
  assert.ok(!server.includes('express.static(path.join(__dirname))'), 'the repo root must not be served wholesale');
  const allowed = new Set(server.match(/const PUBLIC_FILES = new Set\(\[([^\]]*)\]/)[1].match(/'([^']+)'/g).map(f => f.slice(1, -1)));
  for (const f of ['server.js', 'sq.js', 'package.json']) assert.ok(!allowed.has(f), `${f} must not be public`);
  // everything the pages and service worker load must be reachable
  const refs = [read('index.html'), read('admin.html'), read('sw.js')].join('\n')
    .match(/(?:href|src)="[^"#:?]+"|'\/[a-z][\w.-]*\.(?:html|css|js|json)'/g)
    .map(r => r.replace(/^(href|src)=/, '').slice(1, -1).replace(/^\//, ''))
    .filter(f => /\.(html|css|js|json)$/.test(f));
  for (const f of refs) assert.ok(allowed.has(f), `${f} is referenced but not in PUBLIC_FILES`);
  assert.ok(!/ADMIN_PASSWORD\s*=\s*process\.env\.ADMIN_PASSWORD\s*\|\|/.test(server), 'ADMIN_PASSWORD must not have a fallback');
  assert.ok(!/JWT_SECRET\s*=\s*process\.env\.JWT_SECRET\s*\|\|/.test(server), 'JWT_SECRET must not have a fallback');
});

test('booking services match the price-list categories on the page', () => {
  const { SERVICES } = require('../services');
  const categories = [...read('index.html').matchAll(/class="category-name">([^<]*)</g)].map(m => m[1]);
  assert.deepEqual(SERVICES.map(s => s.name), categories, 'services.js and the price-list categories have drifted apart');
});

test('service picks: at least one service, extras need theirs, optional for the admin', () => {
  const { check, summary } = require('../services');
  assert.equal(check(['Manikyr']), '');
  assert.equal(check(['Manikyr', 'Pedikyr', 'Make-Up']), '');
  assert.equal(check([]), 'No service');
  assert.equal(check(undefined), 'Invalid services');
  assert.equal(check('Manikyr'), 'Invalid services');
  assert.equal(check(['Manikyr', 'Manikyr']), 'Invalid services');
  assert.equal(check(['Masazh']), 'Unknown service');
  assert.equal(check([], { required: false }), '');                             // admin may skip
  assert.equal(check(['Masazh'], { required: false }), 'Unknown service');
  assert.equal(check(['Manikyr', 'Manikyr: Trajtim', 'Pedikyr', 'Pedikyr: Trajtim']), '');
  assert.equal(check(['Manikyr: Trajtim']), 'No service');                      // extra alone
  assert.equal(check(['Pedikyr', 'Manikyr: Trajtim']), 'Extra without service');
  assert.equal(check(['Make-Up', 'Make-Up: Trajtim']), 'Unknown service');      // Make-Up has none
  assert.equal(check(['Manikyr: Trajtim'], { required: false }), 'Extra without service');
  assert.equal(summary(['Manikyr', 'Make-Up']), 'Manikyr + Make-Up');
  assert.equal(summary(['Manikyr', 'Manikyr: Trajtim', 'Pedikyr']), 'Manikyr me trajtim + Pedikyr');
  assert.equal(summary(['Manikyr: Tipsa']), 'Manikyr: Tipsa');                  // older bookings
});

test('services are required on public bookings, optional for the admin, and stored', () => {
  const server = read('server.js'), index = read('index.html'), admin = read('admin.html');
  assert.ok(server.includes('ADD COLUMN IF NOT EXISTS services'), 'bookings.services column missing');
  assert.ok(/app\.post\('\/api\/bookings'[\s\S]*?services\.check\(picks\)/.test(server), 'public route must require a service');
  assert.ok(/app\.post\('\/api\/admin\/bookings'[\s\S]*?services\.check\(picks, \{ required: false \}\)/.test(server), 'admin route must validate optional services');
  assert.ok(server.includes('BOOKING_COLS') && /BOOKING_COLS = '[^']*services/.test(server), 'admin lists must return services');
  for (const [page, id] of [[index, 'bk-services'], [admin, 'adm-bk-services']]) {
    assert.ok(page.includes(`id="${id}"`), `#${id} missing`);
    assert.ok(page.indexOf('src="services.js"') < page.indexOf(page === index ? 'src="booking.js"' : 'src="admin.js"'),
      'services.js must load before the page script');
  }
});

test('archive: only past bookings, delete: only archived ones, both admin-only', () => {
  const server = read('server.js'), admin = read('admin.html');
  assert.ok(server.includes('ADD COLUMN IF NOT EXISTS archived_at'), 'bookings.archived_at column missing');
  assert.ok(server.includes("app.post('/api/admin/bookings/archive', requireAdmin"), 'archive route must require admin');
  assert.ok(server.includes("app.post('/api/admin/bookings/delete', requireAdmin"), 'delete route must require admin');
  assert.ok(/SET archived_at = NOW\(\) WHERE id = \$1 AND archived_at IS NULL AND date < \$2/.test(server), 'archive must be limited to past bookings');
  assert.ok(/DELETE FROM bookings WHERE id = \$1 AND archived_at IS NOT NULL/.test(server), 'delete must be limited to archived bookings');
  assert.ok(/BOOKING_COLS = 'id,[^']*archived_at'/.test(server), 'admin lists need the id and archived state');
  assert.ok(admin.includes('data-filter="archived"'), 'archived filter missing');
});

test('public bookings take no email, and email HTML escapes client text', () => {
  const server = read('server.js');
  const route = server.match(/app\.post\('\/api\/bookings'[\s\S]*?\n\}\)\);/)[0];
  assert.ok(!/\bemail\b(?!: null)/.test(route.replace(/\/\/.*$/gm, '')), 'the public route must not read an email from the request');
  assert.ok(server.includes('Përshëndetje ${escHtml(name)}'), 'the email greeting must escape the name');
});

test('login and public bookings are rate-limited; login compares in constant time', () => {
  const server = read('server.js');
  assert.ok(server.includes("app.post('/api/admin/login', loginLimit,"), 'login must be rate-limited');
  assert.ok(server.includes("app.post('/api/bookings', bookingLimit,"), 'public bookings must be rate-limited');
  assert.ok(/sameSecret\(req\.body\.password/.test(server), 'password must be compared with timingSafeEqual');
  assert.ok(server.includes("algorithms: ['HS256']"), 'JWT verification must pin the algorithm');
});

test('input checks: real calendar dates and column-sized text', () => {
  const server = read('server.js');
  const isValidDate = new Function(`${server.match(/function isValidDate\([\s\S]*?\n}/)[0]}; return isValidDate;`)();
  for (const ok of ['2026-11-19', '2028-02-29', '2026-12-31']) assert.ok(isValidDate(ok), ok);
  for (const bad of ['2026-02-30', '2027-02-29', '2026-13-01', '26-11-19', '2026-1-1', 'x', 5, null]) {
    assert.ok(!isValidDate(bad), String(bad));
  }
  const isText = new Function(`const TEXT_MAX = 255; ${server.match(/const isText = [\s\S]*?;\n/)[0]} return isText;`)();
  assert.ok(isText('Ana') && isText(undefined) && isText(''));
  assert.ok(!isText('a'.repeat(256)) && !isText(5) && !isText({}));
  assert.ok(!isText('  ', { required: true }) && isText('Ana', { required: true }));
  // dates never pass through a JS Date (that shifted them by the server's timezone)
  assert.ok(server.includes('types.setTypeParser(types.builtins.DATE'), 'DATE must be parsed as text');
});

test('every /api/admin route except login requires the admin token', () => {
  const server = read('server.js');
  const routes = [...server.matchAll(/app\.(get|post|put|patch|delete)\('(\/api\/admin[^']*)',\s*([^\n]*)/g)];
  assert.ok(routes.length >= 9, `expected the admin routes, found ${routes.length}`);
  for (const [, method, url, rest] of routes) {
    if (url === '/api/admin/login') continue;
    assert.ok(rest.startsWith('requireAdmin'), `${method.toUpperCase()} ${url} is not behind requireAdmin`);
  }
  assert.ok(server.includes('jwt.verify') && server.includes('Bearer '), 'requireAdmin must verify a Bearer JWT');
});

test('.env.example lists every variable the server reads', () => {
  const used = new Set([...read('server.js').matchAll(/process\.env\.([A-Z_]+)/g)].map(m => m[1]));
  const listed = new Set([...read('.env.example').matchAll(/^([A-Z_]+)=/gm)].map(m => m[1]));
  for (const v of used) assert.ok(listed.has(v), `.env.example is missing ${v}`);
});

test('Google Calendar sync is wired to accept, admin-create and cancel', () => {
  const server = read('server.js');
  assert.ok(server.includes('oauth2.googleapis.com/token'), 'service-account token exchange missing');
  assert.ok(server.includes('calendar/v3/calendars'), 'Calendar API call missing');
  assert.ok(/GCAL_READY\s*=\s*!!\(/.test(server), 'calendar must be gated behind a READY flag');
  assert.ok(server.includes('google_event_id'), 'event id must be persisted for later deletion');
  assert.ok(server.includes('calendarDelete(eventId)'), 'cancel must remove the event');
  // RS256 is required for Google service-account JWTs
  assert.ok(server.includes("algorithm: 'RS256'"), 'service-account JWT must be RS256');
});

test('appointment end time rolls the date over correctly', () => {
  const server = read('server.js');
  const m = server.match(/function addMinutes\([\s\S]*?\n}/);
  assert.ok(m, 'addMinutes not found');
  const addMinutes = new Function(`${m[0]}; return addMinutes;`)();

  assert.deepEqual(addMinutes('2026-08-25', '14:30', 60), { date: '2026-08-25', time: '15:30' });
  assert.deepEqual(addMinutes('2026-08-25', '09:05', 25), { date: '2026-08-25', time: '09:30' });
  // 20:00 is the last bookable start; a long treatment must not silently
  // land on the wrong day
  assert.deepEqual(addMinutes('2026-08-25', '20:00', 240), { date: '2026-08-26', time: '00:00' });
  assert.deepEqual(addMinutes('2026-08-31', '23:30', 60), { date: '2026-09-01', time: '00:30' });
  assert.deepEqual(addMinutes('2026-12-31', '23:00', 120), { date: '2027-01-01', time: '01:00' });
});

test('Albanian dates name the right weekday regardless of server timezone', () => {
  const { sqDate } = require('../sq');
  assert.equal(sqDate('2026-09-17'), 'e enjte, 17 shtator');                 // Thursday
  assert.equal(sqDate('2026-09-30', { year: true }), 'e mërkurë, 30 shtator 2026');
  assert.equal(sqDate('2027-01-03'), 'e diel, 3 janar');                     // Sunday
  assert.equal(sqDate('2026-11-28'), 'e shtunë, 28 nëntor');                 // Saturday
});

test('every client SMS is pure GSM-7 and fits one 160-char segment', () => {
  const { smsText } = require('../sq');
  // GSM 03.38 basic character set (no escape table — those cost 2 chars each)
  const GSM7 = new Set(
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
    "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
  );
  // 30 Dec 2026 = Wednesday: longest weekday ("e merkure") + longest month
  // name + two-digit day — the worst case for length.
  for (const kind of ['received', 'accepted', 'denied', 'cancelled']) {
    const text = smsText(kind, '2026-12-30', '19:55');
    assert.ok(text, `no SMS for ${kind}`);
    const bad = [...text].filter(ch => !GSM7.has(ch));
    assert.deepEqual(bad, [], `${kind} SMS has non-GSM-7 chars (forces UCS-2): ${bad.join('')}`);
    assert.ok(text.length <= 160, `${kind} SMS is ${text.length} chars — over one segment`);
  }
});
