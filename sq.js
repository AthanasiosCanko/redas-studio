'use strict';

/* ── Albanian copy shared by server.js ────────────────────
 * Dates are built from name arrays instead of toLocaleDateString('sq-AL'):
 * Node's ICU data for Albanian isn't guaranteed on every host, and a missing
 * locale silently falls back to English.
 */

const MONTHS = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor',
                'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];
const DAYS   = ['e diel', 'e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë'];

// "e enjte, 17 shtator" — or with the year appended. Dates are YYYY-MM-DD and
// read in UTC so the weekday never shifts with the server's timezone.
function sqDate(date, { year = false } = {}) {
  const d = new Date(date + 'T00:00:00Z');
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` +
         (year ? ` ${d.getUTCFullYear()}` : '');
}

// "30 dhjetor" / "30 dhjetor 2026" — for inline use after "më" in sentences,
// where a weekday label ("e mërkurë, …") reads awkwardly.
function sqDayMonth(date, { year = false } = {}) {
  const d = new Date(date + 'T00:00:00Z');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}` + (year ? ` ${d.getUTCFullYear()}` : '');
}

function sqWeekday(date) {
  return DAYS[new Date(date + 'T00:00:00Z').getUTCDay()];
}

// SMS must stay in the GSM-7 alphabet: one ë or ç switches the whole message
// to UCS-2, cutting a segment from 160 to 70 characters and multiplying the
// per-message cost. Albanian SMS is conventionally written without diacritics.
function toGsm(text) {
  return text
    .replace(/ë/g, 'e').replace(/Ë/g, 'E')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/[—–]/g, '-')
    .replace(/[‘’]/g, "'");
}

// kind ∈ 'received' | 'accepted' | 'denied' | 'cancelled'
function smsText(kind, date, time) {
  const when = `${sqDayMonth(date)}, ora ${time}`;
  const body = {
    received:  `E morëm kërkesën tuaj për takim më ${when}. Do t'ju konfirmojmë së shpejti.`,
    accepted:  `Takimi juaj më ${when} u konfirmua. Ju presim!`,
    denied:    `Na vjen keq, nuk mund ta konfirmojmë takimin më ${when}. Zgjidhni një orar tjetër ose na kontaktoni.`,
    cancelled: `Takimi juaj më ${when} u anulua. Na kontaktoni për ta rirezervuar.`,
  }[kind];
  return body ? toGsm(`R-EDA'S STUDIO: ${body}`) : null;
}

module.exports = { MONTHS, DAYS, sqDate, sqDayMonth, sqWeekday, toGsm, smsText };
