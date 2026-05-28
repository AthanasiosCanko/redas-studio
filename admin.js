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
  const daySlots      = document.getElementById('day-panel-slots');

  // ── State ─────────────────────────────────────────────────
  let admViewYear, admViewMonth;
  let admSelectedDate = null;
  let admCalData      = {};
  let currentFilter   = 'upcoming';

  // ── Utilities ────────────────────────────────────────────
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function hint(text) {
    return `<span style="font-family:'Montserrat',sans-serif;font-size:0.65rem;letter-spacing:0.2em;color:var(--brown-mid)">${text}</span>`;
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

  function showLogin() {
    loginScreen.hidden = false;
    dashboard.hidden   = true;
  }

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
        method: 'POST',
        body:   JSON.stringify({ password: pw }),
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

  // ── Bookings ─────────────────────────────────────────────
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

  function renderBookings(all) {
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const list = all.filter(bk => {
      const dt = new Date(bk.date + 'T00:00:00');
      if (currentFilter === 'upcoming') return dt >= today;
      if (currentFilter === 'past')     return dt < today;
      return true;
    });

    if (!list.length) {
      bookingsList.innerHTML = '<p class="adm-empty">No bookings found.</p>';
      return;
    }

    const groups = {};
    for (const bk of list) {
      if (!groups[bk.date]) groups[bk.date] = [];
      groups[bk.date].push(bk);
    }

    bookingsList.innerHTML = '';
    for (const date of Object.keys(groups).sort()) {
      const dt     = new Date(date + 'T00:00:00');
      const isPast = dt < today;

      const group      = document.createElement('div');
      group.className  = 'bk-group';

      const label       = document.createElement('p');
      label.className   = 'bk-group-date';
      label.textContent = dt.toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
      group.appendChild(label);

      for (const bk of groups[date].sort((a, b) => a.time.localeCompare(b.time))) {
        const row     = document.createElement('div');
        row.className = 'bk-item' + (isPast ? ' bk-item--past' : '');
        row.innerHTML = `
          <span class="bk-item-time">${esc(bk.time)}</span>
          <span class="bk-item-name">${esc(bk.name)}</span>
          <span class="bk-item-contact">${esc(bk.contact)}</span>
          <button class="bk-item-cancel" data-date="${esc(bk.date)}" data-time="${esc(bk.time)}">Cancel</button>
        `;
        group.appendChild(row);
      }
      bookingsList.appendChild(group);
    }

    bookingsList.querySelectorAll('.bk-item-cancel').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Cancel this booking?')) return;
        try {
          await apiFetch(`/api/admin/bookings/${btn.dataset.date}/${btn.dataset.time}`, { method: 'DELETE' });
          loadBookings();
          if (admSelectedDate === btn.dataset.date) loadDayPanel(admSelectedDate);
          await loadAdmCalendar();
        } catch {
          alert('Could not cancel booking.');
        }
      });
    });
  }

  // ── Admin calendar ───────────────────────────────────────
  function initAdminCalendar() {
    const now    = new Date();
    admViewYear  = now.getFullYear();
    admViewMonth = now.getMonth();
    loadAdmCalendar();
  }

  async function loadAdmCalendar() {
    try {
      const data = await apiFetch(`/api/calendar/${admViewYear}/${admViewMonth + 1}`);
      admCalData = data.days || {};
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
    const today       = new Date(); today.setHours(0, 0, 0, 0);

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('span');
      empty.className = 'cal-cell cal-cell--empty';
      admGrid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dt   = new Date(admViewYear, admViewMonth, d);
      const key  = `${admViewYear}-${String(admViewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const info = admCalData[key] || { blocked: false, bookingCount: 0 };

      const cell       = document.createElement('button');
      cell.type        = 'button';
      cell.className   = 'cal-cell';
      cell.textContent = d;

      if (info.blocked)            cell.classList.add('cal-cell--adm-blocked');
      if (dt < today)              cell.classList.add('cal-cell--adm-past');
      if (key === admSelectedDate) cell.classList.add('cal-cell--selected');
      if (info.bookingCount > 0)   cell.classList.add('cal-cell--has-bookings');

      cell.addEventListener('click', () => {
        admSelectedDate = key;
        renderAdmCalendar();
        loadDayPanel(key);
      });
      admGrid.appendChild(cell);
    }

    const now = new Date();
    admPrevBtn.disabled      = (admViewYear === now.getFullYear() && admViewMonth === now.getMonth());
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

  // ── Admin booking modal ───────────────────────────────────
  const admOverlay  = document.getElementById('adm-bk-overlay');
  const admBkClose  = document.getElementById('adm-bk-close');
  const admBkSub    = document.getElementById('adm-bk-sub');
  const admBkForm   = document.getElementById('adm-bk-form');
  const admBkName   = document.getElementById('adm-bk-name');
  const admBkContact= document.getElementById('adm-bk-contact');
  const admBkSuccess= document.getElementById('adm-bk-success');

  let pendingAdmSlot = null;

  function openAdmModal(dateKey, time) {
    pendingAdmSlot        = { date: dateKey, time };
    const friendly = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    admBkSub.textContent  = `${friendly}  ·  ${time}`;
    admBkForm.hidden      = false;
    admBkSuccess.hidden   = true;
    admBkName.value       = '';
    admBkContact.value    = '';
    admBkForm.querySelector('.bk-submit').disabled = false;
    admOverlay.hidden     = false;
    admBkName.focus();
  }

  function closeAdmModal() {
    admOverlay.hidden  = true;
    pendingAdmSlot     = null;
  }

  admBkClose.addEventListener('click', closeAdmModal);
  admOverlay.addEventListener('click', e => { if (e.target === admOverlay) closeAdmModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !admOverlay.hidden) closeAdmModal(); });

  document.getElementById('adm-bk-block').addEventListener('click', async () => {
    if (!pendingAdmSlot) return;
    const { date, time } = pendingAdmSlot;
    try {
      await apiFetch('/api/admin/blocked-slots/toggle', {
        method: 'POST', body: JSON.stringify({ date, time }),
      });
      closeAdmModal();
      await loadAdmCalendar();
      await loadDayPanel(date);
    } catch { alert('Could not block slot.'); }
  });

  admBkForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name    = admBkName.value.trim();
    const contact = admBkContact.value.trim();
    if (!name || !contact) return;

    const submitBtn    = admBkForm.querySelector('.bk-submit');
    submitBtn.disabled = true;

    try {
      await apiFetch('/api/admin/bookings', {
        method: 'POST',
        body: JSON.stringify({ date: pendingAdmSlot.date, time: pendingAdmSlot.time, name, contact }),
      });
      admBkForm.hidden    = true;
      admBkSuccess.hidden = false;
      const bookedDate = pendingAdmSlot.date;
      setTimeout(async () => {
        closeAdmModal();
        loadBookings();
        await loadAdmCalendar();
        await loadDayPanel(bookedDate);
      }, 1400);
    } catch (err) {
      alert(err.message === 'Already booked' ? 'This slot is already booked.' : 'Could not save booking.');
      submitBtn.disabled = false;
    }
  });

  // ── Day panel ─────────────────────────────────────────────
  async function loadDayPanel(dateKey) {
    dayPanel.hidden       = false;
    dayPanelTitle.textContent = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    daySlots.innerHTML = hint('Loading…');

    try {
      const { slots, dayBlocked } = await apiFetch(`/api/admin/slots/${dateKey}`);

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

      const today  = new Date(); today.setHours(0, 0, 0, 0);
      const isPast = new Date(dateKey + 'T00:00:00') < today;

      daySlots.innerHTML = '';
      for (const slot of slots) {
        const btn       = document.createElement('button');
        btn.type        = 'button';
        btn.className   = 'adm-slot-btn';
        btn.textContent = slot.time;

        if (slot.status === 'booked') {
          btn.classList.add('adm-slot-btn--booked');
          btn.title = `${slot.booking.name} — ${slot.booking.contact}`;
        } else if (slot.status === 'blocked') {
          btn.classList.add('adm-slot-btn--blocked');
        }
        if (isPast) btn.classList.add('adm-slot-btn--past');

        if (!isPast && slot.status !== 'booked') {
          if (slot.status === 'available') {
            // Click → open booking modal
            btn.addEventListener('click', () => openAdmModal(dateKey, slot.time));
          } else {
            // Blocked → click to unblock
            btn.addEventListener('click', async () => {
              try {
                await apiFetch('/api/admin/blocked-slots/toggle', {
                  method: 'POST', body: JSON.stringify({ date: dateKey, time: slot.time }),
                });
                await loadAdmCalendar();
                await loadDayPanel(dateKey);
              } catch { alert('Could not update.'); }
            });
          }
        }
        daySlots.appendChild(btn);
      }
    } catch {
      daySlots.innerHTML = hint('Could not load slots.');
    }
  }

  // ── Push notifications ────────────────────────────────────
  async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const { key } = await fetch('/api/vapid-public-key').then(r => r.json());
      if (!key) return; // VAPID not configured on server

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });

      await apiFetch('/api/admin/push-subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription: sub }),
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
