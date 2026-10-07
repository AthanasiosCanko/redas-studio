(() => {
  'use strict';

  const { MONTHS, albaniaNow, formatDate, firstFreeTime, shiftMonth, isCurrentMonth, renderMonth } =
    window.RedaCalendar;

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
  const submitBtn   = form.querySelector('.bk-submit');
  const nameInput   = document.getElementById('bk-name');
  const phoneInput  = document.getElementById('bk-phone');
  const successDiv  = document.getElementById('bk-success');

  const friendlyDate = key => formatDate(key, { year: true });

  // A same-day time is past once it has elapsed in Albania local time
  function isPastTime(dateKey, time) {
    const now = albaniaNow();
    if (dateKey !== now.date) return dateKey < now.date;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m < now.totalMins;
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
    monthLabel.textContent = `${MONTHS[viewMonth]} ${viewYear}`;
    const today = albaniaNow().date;

    renderMonth(grid, viewYear, viewMonth, (cell, key) => {
      const info = calendarData[key] || {};
      if (key < today || info.blocked) {
        cell.classList.add('cal-cell--past');
        cell.disabled = true;
        return;
      }
      if (key === today)         cell.classList.add('cal-cell--today');
      if (key === selectedDate)  cell.classList.add('cal-cell--selected');
      if (info.bookingCount > 0) cell.classList.add('cal-cell--has-bookings');
      cell.addEventListener('click', () => selectDate(key));
    });

    prevBtn.disabled = isCurrentMonth(viewYear, viewMonth);
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

    pickWrap.hidden   = dayBlocked;
    dayUnavail.hidden = !dayBlocked;
    if (dayBlocked) return;

    chosenTime = firstFreeTime(key, takenSet);
    if (!picker) {
      picker = RedaTimePicker.create(pickerEl, { initial: chosenTime, onChange: onTimeChange });
    } else {
      picker.setValue(chosenTime);
    }
    renderTaken();
    validateChosen();
  }

  function renderTaken() {
    const times = [...takenSet].sort();
    takenEl.hidden    = !times.length;
    takenEl.innerHTML = times.length
      ? `<span class="taken-label">E zënë</span>` + times.map(t => `<span class="taken-chip">${t}</span>`).join('')
      : '';
  }

  function onTimeChange(value) {
    chosenTime = value;
    validateChosen();
  }

  // Returns true if the chosen time can be requested; updates the warning + button.
  function validateChosen() {
    let msg = '';
    if (takenSet.has(chosenTime))                  msg = 'Ky orar është i zënë — ju lutem zgjidhni një tjetër.';
    else if (isPastTime(selectedDate, chosenTime)) msg = 'Ky orar ka kaluar — ju lutem zgjidhni një tjetër.';
    warningEl.textContent = msg;
    warningEl.hidden      = !msg;
    chooseBtn.disabled    = !!msg;
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
    phoneInput.value     = '';
    submitBtn.disabled   = false;
    overlay.hidden       = false;
    nameInput.focus();
  }

  function closeModal() { overlay.hidden = true; }

  const ERRORS = {
    'Already booked':      'Na vjen keq, ky orar sapo u zu. Ju lutem zgjidhni një tjetër.',
    'Slot is in the past': 'Na vjen keq, ky orar ka kaluar. Ju lutem zgjidhni një tjetër.',
    'Day not available':   'Na vjen keq, kjo ditë nuk është e disponueshme. Ju lutem zgjidhni një tjetër.',
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name  = nameInput.value.trim();
    const local = phoneInput.value.trim();
    if (!name || !local) return;                        // name + phone required
    const phone = '+355 ' + local.replace(/^0+/, '');   // Albanian prefix

    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/bookings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: selectedDate, time: chosenTime, name, phone }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        alert(ERRORS[error] || 'Kërkesa nuk u dërgua — ju lutem provoni përsëri.');
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
      alert('Gabim në lidhje. Ju lutem provoni përsëri.');
      submitBtn.disabled = false;
    }
  });

  // ── Navigation ───────────────────────────────────────────
  const goMonth = delta => {
    const { year, month } = shiftMonth(viewYear, viewMonth, delta);
    navigateCalendar(year, month);
  };
  prevBtn.addEventListener('click', () => goMonth(-1));
  nextBtn.addEventListener('click', () => goMonth(1));

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !overlay.hidden) closeModal(); });

  // ── Init ─────────────────────────────────────────────────
  const [iy, im] = albaniaNow().date.split('-').map(Number);
  navigateCalendar(iy, im - 1);
})();
