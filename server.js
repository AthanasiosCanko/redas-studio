'use strict';

const express  = require('express');
const path     = require('path');
const { Pool } = require('pg');
const jwt      = require('jsonwebtoken');
const webpush  = require('web-push');

const app  = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

const JWT_SECRET      = process.env.JWT_SECRET      || 'dev-secret-change-in-prod';
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD  || 'redas2024';
const VAPID_PUBLIC    = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE   = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:admin@redas-studio.com', VAPID_PUBLIC, VAPID_PRIVATE);
}

const SLOTS       = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30', '19:00'];
const ALBANIA_TZ  = 'Europe/Tirane';

// Returns { date: 'YYYY-MM-DD', totalMins: number } for right now in Albania time.
function nowInAlbania() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ALBANIA_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = type => parts.find(p => p.type === type).value;
  return {
    date:      `${get('year')}-${get('month')}-${get('day')}`,
    totalMins: parseInt(get('hour')) * 60 + parseInt(get('minute')),
  };
}

// A slot is past when its start time has already elapsed in Albania time.
function isSlotPast(date, time) {
  const now = nowInAlbania();
  if (date < now.date) return true;
  if (date > now.date) return false;
  const [h, m] = time.split(':').map(Number);
  return (h * 60 + m) < now.totalMins;
}

// ── DB bootstrap ─────────────────────────────────────────
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        date       DATE         NOT NULL,
        time       VARCHAR(5)   NOT NULL,
        name       VARCHAR(255) NOT NULL,
        contact    VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ  DEFAULT NOW(),
        PRIMARY KEY (date, time)
      );
      CREATE TABLE IF NOT EXISTS blocked_days (
        date DATE PRIMARY KEY
      );
      CREATE TABLE IF NOT EXISTS blocked_slots (
        date DATE       NOT NULL,
        time VARCHAR(5) NOT NULL,
        PRIMARY KEY (date, time)
      );
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id         SERIAL      PRIMARY KEY,
        subscription JSONB     NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}

// ── Push helper ───────────────────────────────────────────
async function notifyAdmin(payload) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  try {
    const { rows } = await pool.query(`SELECT subscription FROM push_subscriptions`);
    await Promise.allSettled(
      rows.map(r =>
        webpush.sendNotification(r.subscription, JSON.stringify(payload)).catch(async err => {
          // Remove expired/invalid subscriptions automatically
          if (err.statusCode === 410 || err.statusCode === 404) {
            await pool.query(
              `DELETE FROM push_subscriptions WHERE subscription = $1`, [r.subscription]
            );
          }
        })
      )
    );
  } catch (err) {
    console.error('Push error:', err.message);
  }
}

// ── Middleware ───────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function requireAdmin(req, res, next) {
  const auth  = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Routes ───────────────────────────────────────────────

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Expose VAPID public key to client
app.get('/api/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC) return res.json({ key: null });
  res.json({ key: VAPID_PUBLIC });
});

app.post('/api/admin/login', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// Save admin push subscription
app.post('/api/admin/push-subscribe', requireAdmin, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'Missing subscription' });
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (subscription)
       VALUES ($1)
       ON CONFLICT (subscription) DO NOTHING`,
      [JSON.stringify(subscription)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Calendar month data: blocked days + booking dot counts
app.get('/api/calendar/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  try {
    const [bkRes, bdRes] = await Promise.all([
      pool.query(
        `SELECT date FROM bookings
         WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
        [year, month]
      ),
      pool.query(
        `SELECT date FROM blocked_days
         WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
        [year, month]
      ),
    ]);

    const days = {};
    for (const row of bkRes.rows) {
      const key = row.date.toISOString().slice(0, 10);
      if (!days[key]) days[key] = { blocked: false, bookingCount: 0 };
      days[key].bookingCount++;
    }
    for (const row of bdRes.rows) {
      const key = row.date.toISOString().slice(0, 10);
      if (!days[key]) days[key] = { blocked: false, bookingCount: 0 };
      days[key].blocked = true;
    }
    res.json({ days });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Slot availability for one day (public — no personal info)
app.get('/api/slots/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const [bkRes, bdRes, bsRes] = await Promise.all([
      pool.query(`SELECT time FROM bookings WHERE date = $1`, [date]),
      pool.query(`SELECT date FROM blocked_days WHERE date = $1`, [date]),
      pool.query(`SELECT time FROM blocked_slots WHERE date = $1`, [date]),
    ]);

    const booked     = new Set(bkRes.rows.map(r => r.time));
    const dayBlocked = bdRes.rows.length > 0;
    const blocked    = new Set(bsRes.rows.map(r => r.time));

    const slots = SLOTS.map(time => {
      if (booked.has(time))                return { time, status: 'booked' };
      if (dayBlocked || blocked.has(time)) return { time, status: 'blocked' };
      if (isSlotPast(date, time))          return { time, status: 'past' };
      return { time, status: 'available' };
    });

    res.json({ slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Create a booking
app.post('/api/bookings', async (req, res) => {
  const { date, time, name, contact } = req.body;
  if (!date || !time || !name?.trim() || !contact?.trim()) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (isSlotPast(date, time)) {
    return res.status(409).json({ error: 'Slot is in the past' });
  }
  try {
    const [blockedRes, existsRes] = await Promise.all([
      pool.query(
        `SELECT 1 FROM blocked_days WHERE date = $1
         UNION ALL
         SELECT 1 FROM blocked_slots WHERE date = $1 AND time = $2`,
        [date, time]
      ),
      pool.query(`SELECT 1 FROM bookings WHERE date = $1 AND time = $2`, [date, time]),
    ]);

    if (blockedRes.rows.length) return res.status(409).json({ error: 'Slot not available' });
    if (existsRes.rows.length)  return res.status(409).json({ error: 'Already booked' });

    await pool.query(
      `INSERT INTO bookings (date, time, name, contact) VALUES ($1, $2, $3, $4)`,
      [date, time, name.trim(), contact.trim()]
    );

    // Fire push notification to admin (non-blocking)
    const friendlyDate = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
    notifyAdmin({
      title: 'New booking',
      body:  `${name.trim()} · ${friendlyDate} · ${time}`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── Admin routes ─────────────────────────────────────────

app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT date, time, name, contact, created_at FROM bookings ORDER BY date, time`
    );
    const bookings = result.rows.map(r => ({
      date:      r.date.toISOString().slice(0, 10),
      time:      r.time,
      name:      r.name,
      contact:   r.contact,
      createdAt: r.created_at,
    }));
    res.json({ bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Slots for a date with booking details (admin only)
app.get('/api/admin/slots/:date', requireAdmin, async (req, res) => {
  const { date } = req.params;
  try {
    const [bkRes, bdRes, bsRes] = await Promise.all([
      pool.query(`SELECT time, name, contact FROM bookings WHERE date = $1`, [date]),
      pool.query(`SELECT date FROM blocked_days WHERE date = $1`, [date]),
      pool.query(`SELECT time FROM blocked_slots WHERE date = $1`, [date]),
    ]);

    const booked     = {};
    for (const r of bkRes.rows) booked[r.time] = { name: r.name, contact: r.contact };
    const dayBlocked = bdRes.rows.length > 0;
    const blocked    = new Set(bsRes.rows.map(r => r.time));

    const slots = SLOTS.map(time => {
      if (booked[time]) return { time, status: 'booked', booking: booked[time] };
      if (dayBlocked || blocked.has(time)) return { time, status: 'blocked' };
      return { time, status: 'available' };
    });

    res.json({ slots, dayBlocked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Admin creates a booking (bypasses blocked checks)
app.post('/api/admin/bookings', requireAdmin, async (req, res) => {
  const { date, time, name, contact } = req.body;
  if (!date || !time || !name?.trim() || !contact?.trim()) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  try {
    const existing = await pool.query(
      `SELECT 1 FROM bookings WHERE date = $1 AND time = $2`, [date, time]
    );
    if (existing.rows.length) return res.status(409).json({ error: 'Already booked' });

    await pool.query(
      `INSERT INTO bookings (date, time, name, contact) VALUES ($1, $2, $3, $4)`,
      [date, time, name.trim(), contact.trim()]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.delete('/api/admin/bookings/:date/:time', requireAdmin, async (req, res) => {
  const { date, time } = req.params;
  try {
    await pool.query(`DELETE FROM bookings WHERE date = $1 AND time = $2`, [date, time]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/api/admin/blocked-days/toggle', requireAdmin, async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: 'Missing date' });
  try {
    const existing = await pool.query(`SELECT 1 FROM blocked_days WHERE date = $1`, [date]);
    if (existing.rows.length) {
      await pool.query(`DELETE FROM blocked_days WHERE date = $1`, [date]);
      res.json({ blocked: false });
    } else {
      await pool.query(`INSERT INTO blocked_days (date) VALUES ($1) ON CONFLICT DO NOTHING`, [date]);
      res.json({ blocked: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/api/admin/blocked-slots/toggle', requireAdmin, async (req, res) => {
  const { date, time } = req.body;
  if (!date || !time) return res.status(400).json({ error: 'Missing fields' });
  try {
    const existing = await pool.query(
      `SELECT 1 FROM blocked_slots WHERE date = $1 AND time = $2`, [date, time]
    );
    if (existing.rows.length) {
      await pool.query(`DELETE FROM blocked_slots WHERE date = $1 AND time = $2`, [date, time]);
      res.json({ blocked: false });
    } else {
      await pool.query(
        `INSERT INTO blocked_slots (date, time) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [date, time]
      );
      res.json({ blocked: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── Start ────────────────────────────────────────────────
initDb()
  .then(() => app.listen(PORT, () => console.log(`Listening on port ${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
