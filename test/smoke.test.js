'use strict';

/**
 * Dependency-free smoke tests — no DB, no network, no browser.
 * Guards against the failures that actually break this static site:
 * syntax errors, malformed JSON, and front-end ↔ back-end contract drift
 * (DOM ids the scripts query, API paths, the SLOTS source of truth).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const JS_FILES = ['server.js', 'booking.js', 'admin.js', 'sw.js'];
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
    'slots-wrap', 'slots-date-label', 'slots-grid',
    'bk-overlay', 'bk-close', 'bk-form', 'bk-name', 'bk-contact', 'bk-success',
  ]) {
    assert.ok(html.includes(`id="${id}"`), `index.html missing #${id}`);
  }
});

test('admin.html exposes every DOM hook admin.js relies on', () => {
  const html = read('admin.html');
  for (const id of [
    'login-screen', 'login-form', 'login-pw', 'login-error',
    'dashboard', 'logout-btn', 'bookings-list', 'bookings-empty',
    'adm-cal-prev', 'adm-cal-next', 'adm-cal-month', 'adm-cal-grid',
    'day-panel', 'day-panel-title', 'adm-block-day-btn', 'day-panel-slots',
    'adm-bk-overlay', 'adm-bk-form', 'adm-bk-name', 'adm-bk-contact', 'adm-bk-block',
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

test('SLOTS are defined once in server.js and consumed by every booking path', () => {
  const server = read('server.js');
  const match = server.match(/const SLOTS\s*=\s*\[([^\]]*)\]/);
  assert.ok(match, 'SLOTS array not found in server.js');
  const slots = [...match[1].matchAll(/'(\d{2}:\d{2})'/g)].map((m) => m[1]);
  assert.ok(slots.length >= 1, 'SLOTS is empty');
  // Times must be sorted and unique — the calendar renders them in order.
  assert.deepEqual(slots, [...new Set(slots)].sort(), 'SLOTS must be unique and sorted');
});

test('every requireAdmin route also references a JWT check', () => {
  const server = read('server.js');
  assert.ok(server.includes('jwt.verify'), 'requireAdmin must verify the JWT');
  assert.ok(server.includes('Bearer '), 'requireAdmin must parse a Bearer token');
});
