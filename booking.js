(() => {
  'use strict';

  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  const BOOK_START = 9 * 60;   // 09:00
  const BOOK_END   = 20 * 60;  // 20:00

  // ── State ───────────────────────────────────────────────
  let viewYear, viewMonth;
  let selectedDate = null;
  let chosenTime   = null;
  let takenSet     = new Set();
  let calendarData = {};
  let picker       = null;

  // ── DOM refs ────────────────────────────────────────────
  const grid        = document.getElementById('cal-grid');
  const monthLabel  = document.getElementById('cal-month-label');
  const prevBtn     = document.getElementById('cal-prev');
  const nextBtn     = document.getElementById('cal-next');
  const slotsWrap   = document.getElementById('slots-wrap');
  const slotsLabel  = document.getElementById('slots-date-label');
  const pickWrap    = document.getElementById('time-pick-wrap');
  const pickerEl    = document.getElementById('time-picker');
  const takenEl     = document.getElementById('taken-times');
  const warningEl   = document.getElementById('slot-warning');
  const chooseBtn   = document.getElementById('choose-time-btn');
  const dayUnavail  = document.getElementById('day-unavailable');

  const overlay     = document.getElementById('bk-overlay');
  const closeBtn    = document.getElementById('bk-close');
  const modalSub    = document.getElementById('bk-modal-sub');
  const form        = document.getElementById('bk-form');
  const nameInput   = document.getElementById('bk-name');
  const emailInput  = document.getElementById('bk-email');
  const phoneInput  = document.getElementById('bk-phone');
  const successDiv  = document.getElementById('bk-success');

  // ── Date / time helpers ──────────────────────────────────
  const toKey = (y, m, d) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

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

  function isPastDay(y, m, d) {
    return toKey(y, m, d) < albaniaNow().date;
  }

  function timeMins(time) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  function isPastTime(dateKey, time) {
    const now = albaniaNow();
    if (dateKey < now.date) return true;
    if (dateKey > now.date) return false;
    return timeMins(time) < now.totalMins;
  }

  function friendlyDate(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  // First 5-minute time that is in range, not taken, and not already past.
  function defaultTime(dateKey) {
    const now = albaniaNow();
    let start = BOOK_START;
    if (dateKey === now.date) start = Math.max(start, Math.ceil(now.totalMins / 5) * 5);
    for (let t = start; t <= BOOK_END; t += 5) {
      const hh = String(Math.floor(t / 60)).padStart(2, '0');
      const mm = String(t % 60).padStart(2, '0');
      if (!takenSet.has(`${hh}:${mm}`)) return `${hh}:${mm}`;
    }
    return '10:00';
  }

  // ── Calendar ─────────────────────────────────────────────
  async function navigateCalendar(year, month) {
    viewYear  = year;
    viewMonth = month;
    try {
      calendarData = (await fetch(`/api/calendar/${year}/${month + 1}`).then(r => r.json())).days || {};
    } catch {
      calendarData = {};
    }
    renderCalendar();
  }

  function renderCalendar() {
    monthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

    const headers = Array.from(grid.querySelectorAll('.cal-day-name'));
    grid.innerHTML = '';
    headers.forEach(h => grid.appendChild(h));

    const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today       = albaniaNow().date;

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('span');
      empty.className = 'cal-cell cal-cell--empty';
      grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key  = toKey(viewYear, viewMonth, d);
      const info = calendarData[key] || { blocked: false, bookingCount: 0 };
      const cell = document.createElement('button');
      cell.type        = 'button';
      cell.className   = 'cal-cell';
      cell.textContent = d;

      if (isPastDay(viewYear, viewMonth, d) || info.blocked) {
        cell.classList.add('cal-cell--past');
        cell.disabled = true;
      } else {
        if (key === today)         cell.classList.add('cal-cell--today');
        if (key === selectedDate)  cell.classList.add('cal-cell--selected');
        if (info.bookingCount > 0) cell.classList.add('cal-cell--has-bookings');
        cell.addEventListener('click', () => selectDate(key));
      }
      grid.appendChild(cell);
    }

    const now = albaniaNow();
    const [ty, tm] = now.date.split('-').map(Number);
    prevBtn.disabled      = (viewYear === ty && viewMonth === tm - 1);
    prevBtn.style.opacity = prevBtn.disabled ? '0.3' : '';
    prevBtn.style.cursor  = prevBtn.disabled ? 'default' : '';
  }

  async function selectDate(key) {
    selectedDate = key;
    renderCalendar();
    await loadDay(key);
  }

  // ── Day → time picker ────────────────────────────────────
  async function loadDay(key) {
    slotsLabel.textContent = friendlyDate(key);
    slotsWrap.hidden       = false;
    warningEl.hidden       = true;

    let dayBlocked = false;
    try {
      const data = await fetch(`/api/availability/${key}`).then(r => r.json());
      takenSet   = new Set(data.taken || []);
      dayBlocked = !!data.dayBlocked;
    } catch {
      takenSet = new Set();
    }

    if (dayBlocked) {
      pickWrap.hidden   = true;
      dayUnavail.hidden = false;
      return;
    }
    pickWrap.hidden   = false;
    dayUnavail.hidden = true;

    const initial = defaultTime(key);
    chosenTime = initial;
    if (!picker) {
      picker = RedaTimePicker.create(pickerEl, { initial, onChange: onTimeChange });
    } else {
      picker.setValue(initial);
    }
    renderTaken();
    validateChosen();
  }

  function renderTaken() {
    const times = [...takenSet].sort();
    if (!times.length) { takenEl.hidden = true; takenEl.innerHTML = ''; return; }
    takenEl.hidden = false;
    takenEl.innerHTML = `<span class="taken-label">Unavailable</span>` +
      times.map(t => `<span class="taken-chip">${t}</span>`).join('');
  }

  function onTimeChange(value) {
    chosenTime = value;
    validateChosen();
  }

  // Returns true if the chosen time can be requested; updates the warning + button.
  function validateChosen() {
    let msg = '';
    if (takenSet.has(chosenTime))                  msg = 'That time is already taken — please pick another.';
    else if (isPastTime(selectedDate, chosenTime)) msg = 'That time has already passed — please pick another.';
    warningEl.textContent   = msg;
    warningEl.hidden        = !msg;
    chooseBtn.disabled      = !!msg;
    chooseBtn.style.opacity = msg ? '0.4' : '';
    return !msg;
  }

  chooseBtn.addEventListener('click', () => {
    if (validateChosen()) openModal(selectedDate, chosenTime);
  });

  // ── Modal ────────────────────────────────────────────────
  function openModal(date, time) {
    modalSub.textContent = `${friendlyDate(date)}  ·  ${time}`;
    form.hidden          = false;
    successDiv.hidden    = true;
    nameInput.value      = '';
    emailInput.value     = '';
    phoneInput.value     = '';
    form.querySelector('.bk-submit').disabled = false;
    overlay.hidden       = false;
    nameInput.focus();
  }

  function closeModal() { overlay.hidden = true; }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name  = nameInput.value.trim();
    const email = emailInput.value.trim();   // optional
    const local = phoneInput.value.trim();
    if (!name || !local) return;             // name + phone required
    const phone = '+355 ' + local.replace(/^0+/, '');  // Albanian prefix

    const submitBtn    = form.querySelector('.bk-submit');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/bookings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: selectedDate, time: chosenTime, name, email, phone }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        alert(error === 'Already booked'      ? 'Sorry, that time was just taken. Please pick another.'
            : error === 'Slot is in the past' ? 'Sorry, that time has already passed. Please pick another.'
            : error === 'Day not available'   ? 'Sorry, that day isn’t available. Please pick another.'
            :                                   'Could not send your request — please try again.');
        submitBtn.disabled = false;
        if (error === 'Already booked' || error === 'Slot is in the past') {
          closeModal();
          await loadDay(selectedDate);
        }
        return;
      }

      form.hidden       = true;
      successDiv.hidden = false;
      setTimeout(async () => {
        closeModal();
        await navigateCalendar(viewYear, viewMonth);
        if (selectedDate) await loadDay(selectedDate);
      }, 2000);
    } catch {
      alert('Network error. Please try again.');
      submitBtn.disabled = false;
    }
  });

  // ── Navigation ───────────────────────────────────────────
  prevBtn.addEventListener('click', () => {
    let y = viewYear, m = viewMonth;
    if (m === 0) { m = 11; y--; } else m--;
    navigateCalendar(y, m);
  });

  nextBtn.addEventListener('click', () => {
    let y = viewYear, m = viewMonth;
    if (m === 11) { m = 0; y++; } else m++;
    navigateCalendar(y, m);
  });

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) closeModal(); });

  // ── Init ─────────────────────────────────────────────────
  const [iy, im] = albaniaNow().date.split('-').map(Number);
  navigateCalendar(iy, im - 1);
})();
