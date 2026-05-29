(() => {
  'use strict';

  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  // ── Token helpers ────────────────────────────────────────
  const TOKEN_KEY  = 'redas_admin_token';
  const getToken   = () => sessionStorage.getItem(TOKEN_KEY);
  const setToken   = t  => sessionStorage.setItem(TOKEN_KEY, t);
  const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

  async function apiFetch(url, opts = {}) {
    const token = getToken();
    const res   = await fetch(url, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error || 'API error'), { status: res.status });
    return data;
  }

  // ── DOM refs ─────────────────────────────────────────────
  const loginScreen   = document.getElementById('login-screen');
  const dashboard     = document.getElementById('dashboard');
  const loginForm     = document.getElementById('login-form');
  const loginError    = document.getElementById('login-error');
  const logoutBtn     = document.getElementById('logout-btn');

  const tabBtns       = document.querySelectorAll('.adm-tab');
  const filterBtns    = document.querySelectorAll('.adm-filter');
  const bookingsList  = document.getElementById('bookings-list');

  const admGrid       = document.getElementById('adm-cal-grid');
  const admMonthLbl   = document.getElementById('adm-cal-month');
  const admPrevBtn    = document.getElementById('adm-cal-prev');
  const admNextBtn    = document.getElementById('adm-cal-next');
  const dayPanel      = document.getElementById('day-panel');
  const dayPanelTitle = document.getElementById('day-panel-title');
  const blockDayBtn   = document.getElementById('adm-block-day-btn');
  const dayBookings   = document.getElementById('day-panel-bookings');
  const addBookingBtn = document.getElementById('adm-add-booking');

  // ── State ─────────────────────────────────────────────────
  let admViewYear, admViewMonth;
  let admSelectedDate = null;
  let admCalData      = {};
  let admDayTaken     = new Set();   // active times for the open day (modal conflict help)
  let currentFilter   = 'requests';

  // ── Utilities ────────────────────────────────────────────
  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function hint(text) {
    return `<span style="font-family:'Montserrat',sans-serif;font-size:0.65rem;letter-spacing:0.2em;color:var(--brown-mid)">${text}</span>`;
  }

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

  function longDate(dateKey) {
    return new Date(dateKey + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  function defaultTime(dateKey, takenSet) {
    const now = albaniaNow();
    let start = 9 * 60;
    if (dateKey === now.date) start = Math.max(start, Math.ceil(now.totalMins / 5) * 5);
    for (let t = start; t <= 20 * 60; t += 5) {
      const hh = String(Math.floor(t / 60)).padStart(2, '0');
      const mm = String(t % 60).padStart(2, '0');
      if (!takenSet.has(`${hh}:${mm}`)) return `${hh}:${mm}`;
    }
    return '10:00';
  }

  // ── Session ───────────────────────────────────────────────
  async function checkSession() {
    if (!getToken()) return showLogin();
    try {
      await apiFetch('/api/admin/bookings');
      showDashboard();
    } catch {
      clearToken();
      showLogin();
    }
  }

  function showLogin()     { loginScreen.hidden = false; dashboard.hidden = true; }
  function showDashboard() {
    loginScreen.hidden = true;
    dashboard.hidden   = false;
    loadBookings();
    initAdminCalendar();
    subscribeToPush();
  }

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    loginError.hidden = true;
    const pw = document.getElementById('login-pw').value;
    try {
      const { token } = await apiFetch('/api/admin/login', {
        method: 'POST', body: JSON.stringify({ password: pw }),
      });
      setToken(token);
      showDashboard();
    } catch {
      loginError.hidden = false;
    }
  });

  logoutBtn.addEventListener('click', () => { clearToken(); showLogin(); });

  // ── Tabs ─────────────────────────────────────────────────
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.toggle('adm-tab--active', b === btn));
      const target = btn.dataset.tab;
      document.querySelectorAll('.adm-section[id^="tab-"]').forEach(s => {
        s.hidden = (s.id !== `tab-${target}`);
      });
    });
  });

  // ── Bookings list ────────────────────────────────────────
  async function loadBookings() {
    try {
      const { bookings } = await apiFetch('/api/admin/bookings');
      renderBookings(bookings);
    } catch {
      bookingsList.innerHTML = hint('Could not load bookings.');
    }
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.toggle('adm-filter--active', b === btn));
      currentFilter = btn.dataset.filter;
      loadBookings();
    });
  });

  function contactLines(bk) {
    const lines = [];
    if (bk.email) lines.push(bk.email);
    if (bk.phone) lines.push(bk.phone);
    if (!lines.length && bk.contact) lines.push(bk.contact);
    return lines;
  }

  function renderBookings(all) {
    const today = albaniaNow().date;

    const list = all.filter(bk => {
      if (currentFilter === 'requests') return bk.status === 'pending';
      if (currentFilter === 'upcoming') return bk.status === 'accepted' && bk.date >= today;
      if (currentFilter === 'past')     return bk.status === 'accepted' && bk.date <  today;
      return true; // all
    });

    if (!list.length) {
      bookingsList.innerHTML = `<p class="adm-empty">No ${currentFilter === 'all' ? '' : currentFilter + ' '}bookings found.</p>`;
      return;
    }

    const groups = {};
    for (const bk of list) (groups[bk.date] ||= []).push(bk);

    bookingsList.innerHTML = '';
    for (const date of Object.keys(groups).sort()) {
      const isPast = date < today;

      const group     = document.createElement('div');
      group.className = 'bk-group';

      const label       = document.createElement('p');
      label.className   = 'bk-group-date';
      label.textContent = longDate(date);
      group.appendChild(label);

      for (const bk of groups[date].sort((a, b) => a.time.localeCompare(b.time))) {
        const row = document.createElement('div');
        row.className = 'bk-item' + (isPast || bk.status !== 'accepted' && bk.status !== 'pending' ? ' bk-item--past' : '');

        const contacts = contactLines(bk).map(c => `<span class="bk-item-contact">${esc(c)}</span>`).join('');

        let actions = '';
        if (bk.status === 'pending') {
          actions = `
            <button class="bk-act bk-act--accept" data-action="accept" data-date="${esc(bk.date)}" data-time="${esc(bk.time)}">Accept</button>
            <button class="bk-act bk-act--deny"   data-action="deny"   data-date="${esc(bk.date)}" data-time="${esc(bk.time)}">Deny</button>`;
        } else if (bk.status === 'accepted' && !isPast) {
          actions = `<button class="bk-act bk-act--cancel" data-action="cancel" data-date="${esc(bk.date)}" data-time="${esc(bk.time)}">Cancel</button>`;
        } else {
          actions = `<span class="bk-status bk-status--${esc(bk.status)}">${esc(bk.status)}</span>`;
        }

        row.innerHTML = `
          <span class="bk-item-time">${esc(bk.time)}</span>
          <div class="bk-item-info">
            <span class="bk-item-name">${esc(bk.name)}</span>
            ${contacts}
          </div>
          <div class="bk-item-actions">${actions}</div>`;
        group.appendChild(row);
      }
      bookingsList.appendChild(group);
    }

    bookingsList.querySelectorAll('.bk-act').forEach(btn => {
      btn.addEventListener('click', () => doStatus(btn.dataset.action, btn.dataset.date, btn.dataset.time));
    });
  }

  async function doStatus(action, date, time) {
    if (action === 'deny'   && !confirm('Deny this request?'))      return;
    if (action === 'cancel' && !confirm('Cancel this booking?'))    return;
    try {
      await apiFetch('/api/admin/bookings/status', {
        method: 'POST', body: JSON.stringify({ date, time, action }),
      });
      loadBookings();
      await loadAdmCalendar();
      if (admSelectedDate) await loadDayPanel(admSelectedDate);
    } catch {
      alert('Could not update the booking.');
    }
  }

  // ── Admin calendar ───────────────────────────────────────
  function initAdminCalendar() {
    const [y, m] = albaniaNow().date.split('-').map(Number);
    admViewYear  = y;
    admViewMonth = m - 1;
    loadAdmCalendar();
  }

  async function loadAdmCalendar() {
    try {
      admCalData = (await apiFetch(`/api/calendar/${admViewYear}/${admViewMonth + 1}`)).days || {};
    } catch {
      admCalData = {};
    }
    renderAdmCalendar();
  }

  function renderAdmCalendar() {
    admMonthLbl.textContent = `${MONTH_NAMES[admViewMonth]} ${admViewYear}`;

    const headers = Array.from(admGrid.querySelectorAll('.cal-day-name'));
    admGrid.innerHTML = '';
    headers.forEach(h => admGrid.appendChild(h));

    const firstDay    = new Date(admViewYear, admViewMonth, 1).getDay();
    const daysInMonth = new Date(admViewYear, admViewMonth + 1, 0).getDate();
    const today       = albaniaNow().date;

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('span');
      empty.className = 'cal-cell cal-cell--empty';
      admGrid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key  = `${admViewYear}-${String(admViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const info = admCalData[key] || { blocked: false, bookingCount: 0 };

      const cell       = document.createElement('button');
      cell.type        = 'button';
      cell.className   = 'cal-cell';
      cell.textContent = d;

      if (info.blocked)            cell.classList.add('cal-cell--adm-blocked');
      if (key < today)             cell.classList.add('cal-cell--adm-past');
      if (key === admSelectedDate) cell.classList.add('cal-cell--selected');
      if (info.bookingCount > 0)   cell.classList.add('cal-cell--has-bookings');

      cell.addEventListener('click', () => {
        admSelectedDate = key;
        renderAdmCalendar();
        loadDayPanel(key);
      });
      admGrid.appendChild(cell);
    }

    const [ty, tm] = today.split('-').map(Number);
    admPrevBtn.disabled      = (admViewYear === ty && admViewMonth === tm - 1);
    admPrevBtn.style.opacity = admPrevBtn.disabled ? '0.3' : '';
    admPrevBtn.style.cursor  = admPrevBtn.disabled ? 'default' : '';
  }

  admPrevBtn.addEventListener('click', () => {
    if (admViewMonth === 0) { admViewMonth = 11; admViewYear--; } else admViewMonth--;
    loadAdmCalendar();
  });
  admNextBtn.addEventListener('click', () => {
    if (admViewMonth === 11) { admViewMonth = 0; admViewYear++; } else admViewMonth++;
    loadAdmCalendar();
  });

  // ── Day panel ─────────────────────────────────────────────
  async function loadDayPanel(dateKey) {
    dayPanel.hidden           = false;
    dayPanelTitle.textContent = longDate(dateKey);
    dayBookings.innerHTML     = hint('Loading…');

    try {
      const { bookings, dayBlocked } = await apiFetch(`/api/admin/day/${dateKey}`);
      admDayTaken = new Set(bookings.map(b => b.time));

      blockDayBtn.textContent = dayBlocked ? 'Unblock day' : 'Block day';
      blockDayBtn.classList.toggle('adm-block-day-btn--on', dayBlocked);
      blockDayBtn.onclick = async () => {
        try {
          const { blocked } = await apiFetch('/api/admin/blocked-days/toggle', {
            method: 'POST', body: JSON.stringify({ date: dateKey }),
          });
          blockDayBtn.textContent = blocked ? 'Unblock day' : 'Block day';
          blockDayBtn.classList.toggle('adm-block-day-btn--on', blocked);
          await loadAdmCalendar();
          await loadDayPanel(dateKey);
        } catch { alert('Could not update.'); }
      };

      if (!bookings.length) {
        dayBookings.innerHTML = `<p class="day-empty">No bookings this day.</p>`;
      } else {
        dayBookings.innerHTML = '';
        for (const bk of bookings) {
          const contacts = contactLines(bk).map(c => `<span class="bk-item-contact">${esc(c)}</span>`).join('');
          const row = document.createElement('div');
          row.className = 'bk-item';
          row.innerHTML = `
            <span class="bk-item-time">${esc(bk.time)}</span>
            <div class="bk-item-info">
              <span class="bk-item-name">${esc(bk.name)}</span>
              ${contacts}
            </div>
            <div class="bk-item-actions"><span class="bk-status bk-status--${esc(bk.status)}">${esc(bk.status)}</span></div>`;
          dayBookings.appendChild(row);
        }
      }
    } catch {
      dayBookings.innerHTML = hint('Could not load this day.');
    }
  }

  addBookingBtn.addEventListener('click', () => {
    if (admSelectedDate) openAdmModal(admSelectedDate);
  });

  // ── Admin booking modal (with wheel time picker) ──────────
  const admOverlay   = document.getElementById('adm-bk-overlay');
  const admBkClose   = document.getElementById('adm-bk-close');
  const admBkSub     = document.getElementById('adm-bk-sub');
  const admBkForm    = document.getElementById('adm-bk-form');
  const admBkName    = document.getElementById('adm-bk-name');
  const admBkEmail   = document.getElementById('adm-bk-email');
  const admBkPhone   = document.getElementById('adm-bk-phone');
  const admBkWarning = document.getElementById('adm-bk-warning');
  const admBkSuccess = document.getElementById('adm-bk-success');
  const admPickerEl  = document.getElementById('adm-time-picker');

  let admModalDate = null;
  let admChosen    = null;
  let admPicker    = null;

  function openAdmModal(dateKey) {
    admModalDate         = dateKey;
    admBkSub.textContent = longDate(dateKey);
    admBkForm.hidden     = false;
    admBkSuccess.hidden  = true;
    admBkName.value      = '';
    admBkEmail.value     = '';
    admBkPhone.value     = '';
    admBkForm.querySelector('.bk-submit').disabled = false;

    const initial = defaultTime(dateKey, admDayTaken);
    admChosen = initial;
    if (!admPicker) {
      admPicker = RedaTimePicker.create(admPickerEl, { initial, onChange: v => { admChosen = v; validateAdm(); } });
    } else {
      admPicker.setValue(initial);
    }
    validateAdm();

    admOverlay.hidden = false;
    admBkName.focus();
  }

  function validateAdm() {
    const msg = admDayTaken.has(admChosen) ? 'That time already has a booking.' : '';
    admBkWarning.textContent = msg;
    admBkWarning.hidden      = !msg;
    admBkForm.querySelector('.bk-submit').disabled = !!msg;
    return !msg;
  }

  function closeAdmModal() { admOverlay.hidden = true; }

  admBkClose.addEventListener('click', closeAdmModal);
  admOverlay.addEventListener('click', e => { if (e.target === admOverlay) closeAdmModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !admOverlay.hidden) closeAdmModal(); });

  admBkForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = admBkName.value.trim();
    if (!name || !validateAdm()) return;

    const submitBtn    = admBkForm.querySelector('.bk-submit');
    const origLabel    = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      await apiFetch('/api/admin/bookings', {
        method: 'POST',
        body: JSON.stringify({
          date: admModalDate, time: admChosen, name,
          email: admBkEmail.value.trim(), phone: admBkPhone.value.trim(),
        }),
      });
      admBkForm.hidden    = true;
      admBkSuccess.hidden = false;
      const date = admModalDate;
      setTimeout(async () => {
        closeAdmModal();
        loadBookings();
        await loadAdmCalendar();
        await loadDayPanel(date);
      }, 1300);
    } catch (err) {
      alert(err.message === 'Already booked'     ? 'That time already has a booking.'
          : err.message === 'Slot is in the past' ? 'That time has already passed.'
          :                                          'Could not save booking.');
    } finally {
      submitBtn.disabled    = false;
      submitBtn.textContent = origLabel;
    }
  });

  // ── Push notifications ────────────────────────────────────
  async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const { key } = await fetch('/api/vapid-public-key').then(r => r.json());
      if (!key) return;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await apiFetch('/api/admin/push-subscribe', {
        method: 'POST', body: JSON.stringify({ subscription: sub }),
      });
    } catch (err) {
      console.warn('Push setup failed:', err.message);
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  // ── Init ─────────────────────────────────────────────────
  checkSession();
})();
