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

// Twilio SMS (optional — a no-op until all three env vars are set)
const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_FROM;          // sender number, e.g. +1xxxxxxxxxx
const SMS_READY    = !!(TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM);

// ── Booking window ───────────────────────────────────────
// Clients may request any time from 09:00 to 20:00 in 5-minute steps.
const ALBANIA_TZ     = 'Europe/Tirane';
const BOOK_START_MIN = 9 * 60;   // 09:00
const BOOK_END_MIN   = 20 * 60;  // 20:00
const SLOT_STEP_MIN  = 5;

// A booking is "active" (occupies its time) while pending or accepted.
const ACTIVE_STATUSES = ['pending', 'accepted'];

function isValidTime(time) {
  if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) return false;
  const [h, m] = time.split(':').map(Number);
  if (m % SLOT_STEP_MIN !== 0) return false;
  const mins = h * 60 + m;
  return mins >= BOOK_START_MIN && mins <= BOOK_END_MIN;
}

// Returns { date: 'YYYY-MM-DD', totalMins } for right now in Albania time.
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

// A time is past when it has already elapsed in Albania local time.
function isSlotPast(date, time) {
  const now = nowInAlbania();
  if (date < now.date) return true;
  if (date > now.date) return false;
  const [h, m] = time.split(':').map(Number);
  return (h * 60 + m) < now.totalMins;
}

// ── DB bootstrap & migration ─────────────────────────────
async function initDb() {
  const client = await pool.connect();
  try {
    // Fresh installs get the full schema; existing installs are migrated below.
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id         SERIAL       PRIMARY KEY,
        date       DATE         NOT NULL,
        time       VARCHAR(5)   NOT NULL,
        name       VARCHAR(255) NOT NULL,
        email      VARCHAR(255),
        phone      VARCHAR(255),
        contact    VARCHAR(255),
        status     VARCHAR(12)  NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ  DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS blocked_days (
        date DATE PRIMARY KEY
      );
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id           SERIAL      PRIMARY KEY,
        subscription JSONB       NOT NULL UNIQUE,
        created_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Migrate a legacy bookings table (PK (date,time); name+contact only).
    await client.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email   VARCHAR(255);
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone   VARCHAR(255);
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contact VARCHAR(255);
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status  VARCHAR(12);
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS id      SERIAL;
      UPDATE bookings SET status = 'accepted' WHERE status IS NULL;
      ALTER TABLE bookings ALTER COLUMN status  SET DEFAULT 'pending';
      ALTER TABLE bookings ALTER COLUMN status  SET NOT NULL;
      ALTER TABLE bookings ALTER COLUMN contact DROP NOT NULL;
    `);

    // Ensure the primary key is id (legacy tables were keyed on (date,time)).
    // Idempotent: only touches the PK when it isn't already exactly (id).
    await client.query(`
      DO $$
      DECLARE
        pk_cols text;
        pk_name text;
      BEGIN
        SELECT c.conname,
               string_agg(a.attname, ',' ORDER BY array_position(c.conkey, a.attnum))
          INTO pk_name, pk_cols
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'bookings'::regclass AND c.contype = 'p'
        GROUP BY c.conname;

        IF pk_cols IS DISTINCT FROM 'id' THEN
          IF pk_name IS NOT NULL THEN
            EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT ' || quote_ident(pk_name);
          END IF;
          ALTER TABLE bookings ADD PRIMARY KEY (id);
        END IF;
      END $$;
    `);

    // Lock a time only while a booking there is active; freed/denied times reopen.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_slot
      ON bookings (date, time)
      WHERE status IN ('pending', 'accepted')
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
          if (err.statusCode === 410 || err.statusCode === 404) {
            await pool.query(`DELETE FROM push_subscriptions WHERE subscription = $1`, [r.subscription]);
          }
        })
      )
    );
  } catch (err) {
    console.error('Push error:', err.message);
  }
}

function friendlyDate(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

// Send an SMS via Twilio's REST API (graceful no-op when not configured).
async function sendSms(to, body) {
  if (!SMS_READY || !to) return;
  const num = String(to).replace(/[^\d+]/g, '');   // collapse to E.164 digits
  if (num.length < 8) return;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: num, From: TWILIO_FROM, Body: body }),
      }
    );
    if (!res.ok) console.error('SMS failed:', res.status, await res.text());
  } catch (err) {
    console.error('SMS error:', err.message);
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

// ── Public routes ─────────────────────────────────────────

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/api/vapid-public-key', (req, res) => {
  res.json({ key: VAPID_PUBLIC || null });
});

// Calendar month data: blocked days + active-booking dot counts
app.get('/api/calendar/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  try {
    const [bkRes, bdRes] = await Promise.all([
      pool.query(
        `SELECT date FROM bookings
         WHERE status IN ('pending','accepted')
           AND EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
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

// Availability for one day (public — only the taken times, no personal info)
app.get('/api/availability/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const [bkRes, bdRes] = await Promise.all([
      pool.query(
        `SELECT time FROM bookings WHERE date = $1 AND status IN ('pending','accepted') ORDER BY time`,
        [date]
      ),
      pool.query(`SELECT 1 FROM blocked_days WHERE date = $1`, [date]),
    ]);
    res.json({
      taken:      bkRes.rows.map(r => r.time),
      dayBlocked: bdRes.rows.length > 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Create a booking request (status: pending)
app.post('/api/bookings', async (req, res) => {
  const { date, time, name, email, phone } = req.body;
  if (!date || !time || !name?.trim() || !email?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (!isValidTime(time)) return res.status(400).json({ error: 'Invalid time' });
  if (isSlotPast(date, time)) return res.status(409).json({ error: 'Slot is in the past' });

  try {
    const [blockedRes, takenRes] = await Promise.all([
      pool.query(`SELECT 1 FROM blocked_days WHERE date = $1`, [date]),
      pool.query(
        `SELECT 1 FROM bookings WHERE date = $1 AND time = $2 AND status IN ('pending','accepted')`,
        [date, time]
      ),
    ]);
    if (blockedRes.rows.length) return res.status(409).json({ error: 'Day not available' });
    if (takenRes.rows.length)   return res.status(409).json({ error: 'Already booked' });

    await pool.query(
      `INSERT INTO bookings (date, time, name, email, phone, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [date, time, name.trim(), email.trim(), phone.trim()]
    );

    notifyAdmin({
      title: 'Booking request',
      body:  `${name.trim()} · ${friendlyDate(date)} · ${time}`,
    });
    sendSms(phone, `R-EDA'S STUDIO — we received your request for ${friendlyDate(date)} at ${time}. We'll confirm shortly.`);

    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already booked' });
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ── Admin routes ─────────────────────────────────────────

app.post('/api/admin/login', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

app.post('/api/admin/push-subscribe', requireAdmin, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return res.status(400).json({ error: 'Missing subscription' });
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (subscription) VALUES ($1)
       ON CONFLICT (subscription) DO NOTHING`,
      [JSON.stringify(subscription)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

function mapBooking(r) {
  return {
    date:      r.date.toISOString().slice(0, 10),
    time:      r.time,
    name:      r.name,
    email:     r.email,
    phone:     r.phone,
    contact:   r.contact,        // legacy rows only
    status:    r.status,
    createdAt: r.created_at,
  };
}

// All bookings (every status) — the client filters by status
app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT date, time, name, email, phone, contact, status, created_at
       FROM bookings ORDER BY date, time`
    );
    res.json({ bookings: result.rows.map(mapBooking) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// One day's active bookings + blocked state (for the availability panel)
app.get('/api/admin/day/:date', requireAdmin, async (req, res) => {
  const { date } = req.params;
  try {
    const [bkRes, bdRes] = await Promise.all([
      pool.query(
        `SELECT date, time, name, email, phone, contact, status, created_at
         FROM bookings WHERE date = $1 AND status IN ('pending','accepted') ORDER BY time`,
        [date]
      ),
      pool.query(`SELECT 1 FROM blocked_days WHERE date = $1`, [date]),
    ]);
    res.json({
      bookings:   bkRes.rows.map(mapBooking),
      dayBlocked: bdRes.rows.length > 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Accept / deny / cancel a booking (status transition; nothing is deleted)
const STATUS_TRANSITIONS = {
  accept: { to: 'accepted',  from: 'pending'  },
  deny:   { to: 'denied',    from: 'pending'  },
  cancel: { to: 'cancelled', from: 'accepted' },
};

app.post('/api/admin/bookings/status', requireAdmin, async (req, res) => {
  const { date, time, action } = req.body;
  const tr = STATUS_TRANSITIONS[action];
  if (!date || !time || !tr) return res.status(400).json({ error: 'Bad request' });
  try {
    const result = await pool.query(
      `UPDATE bookings SET status = $1 WHERE date = $2 AND time = $3 AND status = $4
       RETURNING name, phone`,
      [tr.to, date, time, tr.from]
    );
    if (!result.rowCount) return res.status(409).json({ error: 'Not in expected state' });

    const { phone } = result.rows[0];
    const fd = friendlyDate(date);
    if (action === 'accept')      sendSms(phone, `R-EDA'S STUDIO — your appointment on ${fd} at ${time} is confirmed. See you soon!`);
    else if (action === 'deny')   sendSms(phone, `R-EDA'S STUDIO — sorry, we couldn't confirm your request for ${fd} at ${time}. Please try another time or contact us.`);
    else if (action === 'cancel') sendSms(phone, `R-EDA'S STUDIO — your appointment on ${fd} at ${time} has been cancelled. Please contact us to rebook.`);

    res.json({ ok: true, status: tr.to });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Admin creates a booking directly (auto-accepted; bypasses day-block, not the time cutoff)
app.post('/api/admin/bookings', requireAdmin, async (req, res) => {
  const { date, time, name, email, phone } = req.body;
  if (!date || !time || !name?.trim()) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (!isValidTime(time)) return res.status(400).json({ error: 'Invalid time' });
  if (isSlotPast(date, time)) return res.status(409).json({ error: 'Slot is in the past' });
  try {
    const taken = await pool.query(
      `SELECT 1 FROM bookings WHERE date = $1 AND time = $2 AND status IN ('pending','accepted')`,
      [date, time]
    );
    if (taken.rows.length) return res.status(409).json({ error: 'Already booked' });

    const cleanPhone = phone?.trim() || null;
    await pool.query(
      `INSERT INTO bookings (date, time, name, email, phone, status)
       VALUES ($1, $2, $3, $4, $5, 'accepted')`,
      [date, time, name.trim(), email?.trim() || null, cleanPhone]
    );
    sendSms(cleanPhone, `R-EDA'S STUDIO — your appointment on ${friendlyDate(date)} at ${time} is confirmed. See you soon!`);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already booked' });
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

// ── Start ────────────────────────────────────────────────
initDb()
  .then(() => app.listen(PORT, () => console.log(`Listening on port ${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
