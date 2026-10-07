/* ── R-EDA'S STUDIO — calendar helpers ───────────────────
 * Shared by the public booking page (booking.js) and the admin panel
 * (admin.js): Albania-local "now", Albanian date labels, the first free
 * time on a day, month navigation and the month-grid renderer.
 */
(() => {
  'use strict';

  // Built by hand: `sq-AL` locale data is missing or partial in some browsers.
  const MONTHS   = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor',
                    'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
  const WEEKDAYS = ['E diel', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë'];

  // Booking window — mirrors isValidTime in server.js
  const OPEN_MIN  = 9 * 60;    // 09:00, first bookable start
  const CLOSE_MIN = 20 * 60;   // 20:00, last bookable start
  const STEP_MIN  = 5;

  const pad = n => String(n).padStart(2, '0');

  // 'YYYY-MM-DD' from a 0-based month
  const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

  // Today's date key and minutes since midnight, in Albania time
  function albaniaNow() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Tirane',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    return {
      date:      `${get('year')}-${get('month')}-${get('day')}`,
      totalMins: parseInt(get('hour')) * 60 + parseInt(get('minute')),
    };
  }

  // "E premte, 9 tetor" — or "E premte, 9 tetor 2026" with { year: true }
  function formatDate(key, { year = false } = {}) {
    const [y, m, d] = key.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
    return `${weekday}, ${d} ${MONTHS[m - 1].toLowerCase()}` + (year ? ` ${y}` : '');
  }

  // First time on `key` that is bookable, not in `taken`, and not already past
  function firstFreeTime(key, taken) {
    const now = albaniaNow();
    let start = OPEN_MIN;
    if (key === now.date) start = Math.max(start, Math.ceil(now.totalMins / STEP_MIN) * STEP_MIN);
    for (let t = start; t <= CLOSE_MIN; t += STEP_MIN) {
      const time = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
      if (!taken.has(time)) return time;
    }
    return '10:00';
  }

  // { year, month } `delta` months away, rolling the year over
  function shiftMonth(year, month, delta) {
    const d = new Date(year, month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }

  // Months before the current Albania month can't be navigated to
  function isCurrentMonth(year, month) {
    const [y, m] = albaniaNow().date.split('-').map(Number);
    return year === y && month === m - 1;
  }

  // Rebuild the day cells under the grid's weekday headers.
  // `decorate(cell, key)` styles each day button and wires its click.
  function renderMonth(grid, year, month, decorate) {
    grid.querySelectorAll('.cal-cell').forEach(el => el.remove());

    const lead = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < lead; i++) {
      const empty = document.createElement('span');
      empty.className = 'cal-cell cal-cell--empty';
      grid.appendChild(empty);
    }
    for (let d = 1; d <= days; d++) {
      const cell = document.createElement('button');
      cell.type        = 'button';
      cell.className   = 'cal-cell';
      cell.textContent = d;
      decorate(cell, dateKey(year, month, d));
      grid.appendChild(cell);
    }
  }

  window.RedaCalendar = {
    MONTHS, albaniaNow, formatDate, firstFreeTime, shiftMonth, isCurrentMonth, renderMonth,
  };
})();
