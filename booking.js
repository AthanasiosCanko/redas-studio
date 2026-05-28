(() => {
  'use strict';

  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  // ── State ───────────────────────────────────────────────
  let viewYear, viewMonth;
  let selectedDate = null;
  let pendingSlot  = null;
  let calendarData = {};   // { "YYYY-MM-DD": { blocked, bookingCount } }

  // ── DOM refs ────────────────────────────────────────────
  const grid         = document.getElementById('cal-grid');
  const monthLabel   = document.getElementById('cal-month-label');
  const prevBtn      = document.getElementById('cal-prev');
  const nextBtn      = document.getElementById('cal-next');
  const slotsWrap    = document.getElementById('slots-wrap');
  const slotsGrid    = document.getElementById('slots-grid');
  const slotsLabel   = document.getElementById('slots-date-label');
  const overlay      = document.getElementById('bk-overlay');
  const closeBtn     = document.getElementById('bk-close');
  const modalSub     = document.getElementById('bk-modal-sub');
  const form         = document.getElementById('bk-form');
  const nameInput    = document.getElementById('bk-name');
  const contactInput = document.getElementById('bk-contact');
  const successDiv   = document.getElementById('bk-success');

  // ── Date helpers ─────────────────────────────────────────
  function toKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function todayKey() {
    const n = new Date();
    return toKey(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function isPast(y, m, d) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(y, m, d) < today;
  }

  function friendlyDate(dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  }

  // ── Loading hint ─────────────────────────────────────────
  function hint(text) {
    return `<span style="font-family:'Montserrat',sans-serif;font-size:0.65rem;letter-spacing:0.2em;color:var(--brown-mid)">${text}</span>`;
  }

  // ── Calendar ─────────────────────────────────────────────
  async function navigateCalendar(year, month) {
    viewYear  = year;
    viewMonth = month;
    try {
      const data = await fetch(`/api/calendar/${year}/${month + 1}`).then(r => r.json());
      calendarData = data.days || {};
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
    const today       = todayKey();

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

      if (isPast(viewYear, viewMonth, d) || info.blocked) {
        cell.classList.add('cal-cell--past');
        cell.disabled = true;
      } else {
        if (key === today)          cell.classList.add('cal-cell--today');
        if (key === selectedDate)   cell.classList.add('cal-cell--selected');
        if (info.bookingCount > 0)  cell.classList.add('cal-cell--has-bookings');
        cell.addEventListener('click', () => selectDate(key));
      }
      grid.appendChild(cell);
    }

    const now = new Date();
    prevBtn.disabled      = (viewYear === now.getFullYear() && viewMonth === now.getMonth());
    prevBtn.style.opacity = prevBtn.disabled ? '0.3' : '';
    prevBtn.style.cursor  = prevBtn.disabled ? 'default' : '';
  }

  async function selectDate(key) {
    selectedDate = key;
    renderCalendar();
    await renderSlots(key);
  }

  // ── Slots ────────────────────────────────────────────────
  async function renderSlots(key) {
    slotsLabel.textContent = friendlyDate(key);
    slotsGrid.innerHTML    = hint('Loading…');
    slotsWrap.hidden       = false;

    try {
      const { slots } = await fetch(`/api/slots/${key}`).then(r => r.json());
      slotsGrid.innerHTML = '';
      for (const { time, status } of slots) {
        const btn = document.createElement('button');
        btn.type        = 'button';
        btn.className   = 'slot-btn';
        btn.textContent = time;
        if (status !== 'available') {
          btn.disabled = true;
          btn.title    = status === 'booked' ? 'Already booked' : 'Not available';
        } else {
          btn.addEventListener('click', () => openModal(key, time));
        }
        slotsGrid.appendChild(btn);
      }
    } catch {
      slotsGrid.innerHTML = hint('Could not load slots — please refresh.');
    }
  }

  // ── Modal ────────────────────────────────────────────────
  function openModal(date, time) {
    pendingSlot = { date, time };
    modalSub.textContent   = `${friendlyDate(date)}  ·  ${time}`;
    form.hidden            = false;
    successDiv.hidden      = true;
    nameInput.value        = '';
    contactInput.value     = '';
    overlay.hidden         = false;
    nameInput.focus();
  }

  function closeModal() {
    overlay.hidden = true;
    pendingSlot    = null;
  }

  // ── Form submit ──────────────────────────────────────────
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name    = nameInput.value.trim();
    const contact = contactInput.value.trim();
    if (!name || !contact) return;

    const submitBtn    = form.querySelector('.bk-submit');
    submitBtn.disabled = true;

    try {
      const res = await fetch('/api/bookings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: pendingSlot.date, time: pendingSlot.time, name, contact }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        alert(error === 'Already booked'
          ? 'Sorry, this slot was just taken. Please pick another.'
          : 'Could not complete booking — please try again.');
        submitBtn.disabled = false;
        return;
      }

      form.hidden       = true;
      successDiv.hidden = false;

      setTimeout(async () => {
        closeModal();
        await navigateCalendar(viewYear, viewMonth);
        if (selectedDate) await renderSlots(selectedDate);
      }, 1800);
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
  const now = new Date();
  navigateCalendar(now.getFullYear(), now.getMonth());
})();
