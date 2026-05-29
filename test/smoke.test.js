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

const JS_FILES = ['server.js', 'booking.js', 'admin.js', 'sw.js', 'timepicker.js'];
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
    'bk-overlay', 'bk-close', 'bk-form', 'bk-name', 'bk-email', 'bk-phone', 'bk-success',
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

test('the time picker exposes RedaTimePicker.create', () => {
  const tp = read('timepicker.js');
  assert.ok(tp.includes('window.RedaTimePicker'), 'timepicker must attach RedaTimePicker to window');
  assert.ok(/create\s*\(/.test(tp), 'timepicker must expose a create()');
});

test('every requireAdmin route also references a JWT check', () => {
  const server = read('server.js');
  assert.ok(server.includes('jwt.verify'), 'requireAdmin must verify the JWT');
  assert.ok(server.includes('Bearer '), 'requireAdmin must parse a Bearer token');
});
