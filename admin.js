(() => {
  'use strict';

  const { MONTHS, albaniaNow, formatDate, firstFreeTime, shiftMonth, isCurrentMonth, renderMonth } =
    window.RedaCalendar;

  const STATUS_LABELS = { pending: 'Në pritje', accepted: 'Konfirmuar', denied: 'Refuzuar', cancelled: 'Anuluar' };
  const EMPTY_LABELS  = {
    requests: 'Nuk ka kërkesa.',
    upcoming: 'Nuk ka rezervime të ardhshme.',
    past:     'Nuk ka rezervime të kaluara.',
    all:      'Nuk ka rezervime.',
  };

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

  const post = (url, body) => apiFetch(url, { method: 'POST', body: JSON.stringify(body) });

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

  const hint = text => `<span class="adm-hint">${text}</span>`;

  const statusBadge = status =>
    `<span class="bk-status bk-status--${esc(status)}">${esc(STATUS_LABELS[status] || status)}</span>`;

  // One booking row: time, name + contact lines, and the actions column
  function bookingRow(bk, actionsHtml, extraClass = '') {
    // Legacy rows predate the email/phone split and only carry `contact`
    const contacts = [bk.email, bk.phone].filter(Boolean);
    if (!contacts.length && bk.contact) contacts.push(bk.contact);

    const row = document.createElement('div');
    row.className = `bk-item${extraClass}`;
    row.innerHTML = `
      <span class="bk-item-time">${esc(bk.time)}</span>
      <div class="bk-item-info">
        <span class="bk-item-name">${esc(bk.name)}</span>
        ${contacts.map(c => `<span class="bk-item-contact">${esc(c)}</span>`).join('')}
      </div>
      <div class="bk-item-actions">${actionsHtml}</div>`;
    return row;
  }

  // Bookings list, calendar dots and the open day panel all show the same data
  async function refreshAll() {
    loadBookings();
    await loadAdmCalendar();
    if (admSelectedDate) await loadDayPanel(admSelectedDate);
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
    try {
      const { token } = await post('/api/admin/login', { password: document.getElementById('login-pw').value });
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
      document.querySelectorAll('.adm-section[id^="tab-"]').forEach(s => {
        s.hidden = (s.id !== `tab-${btn.dataset.tab}`);
      });
    });
  });

  // ── Bookings list ────────────────────────────────────────
  async function loadBookings() {
    try {
      const { bookings } = await apiFetch('/api/admin/bookings');
      renderBookings(bookings);
    } catch {
      bookingsList.innerHTML = hint('Rezervimet nuk u ngarkuan.');
    }
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.toggle('adm-filter--active', b === btn));
      currentFilter = btn.dataset.filter;
      loadBookings();
    });
  });

  const FILTERS = {
    requests: (bk)        => bk.status === 'pending',
    upcoming: (bk, today) => bk.status === 'accepted' && bk.date >= today,
    past:     (bk, today) => bk.status === 'accepted' && bk.date <  today,
    all:      ()          => true,
  };

  function actionButtons(bk, isPast) {
    const btn = (action, label) =>
      `<button class="bk-act bk-act--${action}" data-action="${action}" data-date="${esc(bk.date)}" data-time="${esc(bk.time)}">${label}</button>`;
    if (bk.status === 'pending')               return btn('accept', 'Prano') + btn('deny', 'Refuzo');
    if (bk.status === 'accepted' && !isPast)   return btn('cancel', 'Anulo');
    return statusBadge(bk.status);
  }

  function renderBookings(all) {
    const today = albaniaNow().date;
    const list  = all.filter(bk => FILTERS[currentFilter](bk, today));

    if (!list.length) {
      bookingsList.innerHTML = `<p class="adm-empty">${EMPTY_LABELS[currentFilter]}</p>`;
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
      label.textContent = formatDate(date);
      group.appendChild(label);

      for (const bk of groups[date].sort((a, b) => a.time.localeCompare(b.time))) {
        const inactive = isPast || (bk.status !== 'accepted' && bk.status !== 'pending');
        group.appendChild(bookingRow(bk, actionButtons(bk, isPast), inactive ? ' bk-item--past' : ''));
      }
      bookingsList.appendChild(group);
    }

    bookingsList.querySelectorAll('.bk-act').forEach(btn => {
      btn.addEventListener('click', () => doStatus(btn.dataset.action, btn.dataset.date, btn.dataset.time));
    });
  }

  const CONFIRMS = { deny: 'Ta refuzoni këtë kërkesë?', cancel: 'Ta anuloni këtë rezervim?' };

  async function doStatus(action, date, time) {
    if (CONFIRMS[action] && !confirm(CONFIRMS[action])) return;
    try {
      await post('/api/admin/bookings/status', { date, time, action });
      await refreshAll();
    } catch {
      alert('Rezervimi nuk u përditësua.');
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
    admMonthLbl.textContent = `${MONTHS[admViewMonth]} ${admViewYear}`;
    const today = albaniaNow().date;

    // Unlike the public calendar, past and blocked days stay clickable
    renderMonth(admGrid, admViewYear, admViewMonth, (cell, key) => {
      const info = admCalData[key] || {};
      if (info.blocked)            cell.classList.add('cal-cell--adm-blocked');
      if (key < today)             cell.classList.add('cal-cell--adm-past');
      if (key === admSelectedDate) cell.classList.add('cal-cell--selected');
      if (info.bookingCount > 0)   cell.classList.add('cal-cell--has-bookings');
      cell.addEventListener('click', () => {
        admSelectedDate = key;
        renderAdmCalendar();
        loadDayPanel(key);
      });
    });

    admPrevBtn.disabled = isCurrentMonth(admViewYear, admViewMonth);
  }

  const goAdmMonth = delta => {
    ({ year: admViewYear, month: admViewMonth } = shiftMonth(admViewYear, admViewMonth, delta));
    loadAdmCalendar();
  };
  admPrevBtn.addEventListener('click', () => goAdmMonth(-1));
  admNextBtn.addEventListener('click', () => goAdmMonth(1));

  // ── Day panel ─────────────────────────────────────────────
  async function loadDayPanel(dateKey) {
    dayPanel.hidden           = false;
    dayPanelTitle.textContent = formatDate(dateKey);
    dayBookings.innerHTML     = hint('Duke u ngarkuar…');

    try {
      const { bookings, dayBlocked } = await apiFetch(`/api/admin/day/${dateKey}`);
      admDayTaken = new Set(bookings.map(b => b.time));

      blockDayBtn.textContent = dayBlocked ? 'Zhblloko ditën' : 'Blloko ditën';
      blockDayBtn.classList.toggle('adm-block-day-btn--on', dayBlocked);

      if (!bookings.length) {
        dayBookings.innerHTML = `<p class="day-empty">Nuk ka rezervime këtë ditë.</p>`;
      } else {
        dayBookings.innerHTML = '';
        for (const bk of bookings) dayBookings.appendChild(bookingRow(bk, statusBadge(bk.status)));
      }
    } catch {
      dayBookings.innerHTML = hint('Kjo ditë nuk u ngarkua.');
    }
  }

  // The panel always shows admSelectedDate, so one listener serves every day
  blockDayBtn.addEventListener('click', async () => {
    try {
      await post('/api/admin/blocked-days/toggle', { date: admSelectedDate });
      await loadAdmCalendar();
      await loadDayPanel(admSelectedDate);
    } catch { alert('Nuk u përditësua.'); }
  });

  addBookingBtn.addEventListener('click', () => {
    if (admSelectedDate) openAdmModal(admSelectedDate);
  });

  // ── Admin booking modal (with wheel time picker) ──────────
  const admOverlay   = document.getElementById('adm-bk-overlay');
  const admBkClose   = document.getElementById('adm-bk-close');
  const admBkSub     = document.getElementById('adm-bk-sub');
  const admBkForm    = document.getElementById('adm-bk-form');
  const admBkSubmit  = admBkForm.querySelector('.bk-submit');
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
    admBkSub.textContent = formatDate(dateKey);
    admBkForm.hidden     = false;
    admBkSuccess.hidden  = true;
    admBkName.value      = '';
    admBkEmail.value     = '';
    admBkPhone.value     = '';
    admBkSubmit.disabled = false;

    admChosen = firstFreeTime(dateKey, admDayTaken);
    if (!admPicker) {
      admPicker = RedaTimePicker.create(admPickerEl, { initial: admChosen, onChange: v => { admChosen = v; validateAdm(); } });
    } else {
      admPicker.setValue(admChosen);
    }
    validateAdm();

    admOverlay.hidden = false;
    admBkName.focus();
  }

  function validateAdm() {
    const msg = admDayTaken.has(admChosen) ? 'Ky orar ka tashmë një rezervim.' : '';
    admBkWarning.textContent = msg;
    admBkWarning.hidden      = !msg;
    admBkSubmit.disabled     = !!msg;
    return !msg;
  }

  function closeAdmModal() { admOverlay.hidden = true; }

  admBkClose.addEventListener('click', closeAdmModal);
  admOverlay.addEventListener('click', e => { if (e.target === admOverlay) closeAdmModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !admOverlay.hidden) closeAdmModal(); });

  const ADD_ERRORS = {
    'Already booked':      'Ky orar ka tashmë një rezervim.',
    'Slot is in the past': 'Ky orar ka kaluar.',
  };

  admBkForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = admBkName.value.trim();
    if (!name || !validateAdm()) return;

    const origLabel = admBkSubmit.textContent;
    admBkSubmit.disabled    = true;
    admBkSubmit.textContent = 'Duke ruajtur…';

    try {
      const localPhone = admBkPhone.value.trim();
      await post('/api/admin/bookings', {
        date: admModalDate, time: admChosen, name,
        email: admBkEmail.value.trim(),
        phone: localPhone ? '+355 ' + localPhone.replace(/^0+/, '') : '',
      });
      admBkForm.hidden    = true;
      admBkSuccess.hidden = false;
      setTimeout(() => { closeAdmModal(); refreshAll(); }, 1300);
    } catch (err) {
      alert(ADD_ERRORS[err.message] || 'Rezervimi nuk u ruajt.');
    } finally {
      admBkSubmit.disabled    = false;
      admBkSubmit.textContent = origLabel;
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
      await post('/api/admin/push-subscribe', { subscription: sub });
    } catch (err) {
      console.warn('Push setup failed:', err.message);
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  }

  // ── Init ─────────────────────────────────────────────────
  checkSession();
})();
