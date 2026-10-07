/* ── R-EDA'S STUDIO — wheel time picker ──────────────────
 * iOS-style scroll wheels for hours (09–20) and minutes (00–55, step 5).
 * Vanilla JS, no deps. Shared by the public booking modal and the admin modal.
 *
 *   const tp = RedaTimePicker.create(containerEl, { initial: '10:00', onChange });
 *   tp.setValue('14:30');   // onChange fires with "HH:MM" on every settle
 */
(() => {
  'use strict';

  // px per row — must match .tp-opt height in booking.css (the wheel shows
  // 5 rows; .tp-spacer pads 2 rows so the first/last option can centre)
  const ITEM_H = 40;

  const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 9).padStart(2, '0')); // 09..20
  const MINS  = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // 00..55

  // 20:00 is the last bookable time, so only :00 is valid at hour 20.
  const minutesFor = h => (h === '20' ? ['00'] : MINS);

  function create(container, { initial = '10:00', onChange } = {}) {
    container.classList.add('time-picker');
    container.innerHTML = `
      <div class="tp-wheel" data-wheel="h"></div>
      <span class="tp-colon">:</span>
      <div class="tp-wheel" data-wheel="m"></div>
      <div class="tp-highlight" aria-hidden="true"></div>
    `;
    const hWheel = container.querySelector('[data-wheel="h"]');
    const mWheel = container.querySelector('[data-wheel="m"]');

    let hour = '10';
    let min  = '00';

    function fillWheel(wheel, list) {
      wheel.innerHTML =
        `<div class="tp-spacer"></div>` +
        list.map(v => `<button type="button" class="tp-opt" data-val="${v}">${v}</button>`).join('') +
        `<div class="tp-spacer"></div>`;
    }

    function markActive(wheel, idx) {
      wheel.querySelectorAll('.tp-opt').forEach((el, i) =>
        el.classList.toggle('tp-opt--active', i === idx));
    }

    function scrollToIndex(wheel, idx, smooth) {
      wheel.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
    }

    // Jump a wheel to `value` and highlight it
    function place(wheel, list, value) {
      const idx = list.indexOf(value);
      scrollToIndex(wheel, idx, false);
      markActive(wheel, idx);
    }

    // The value a wheel has come to rest on, highlighted
    function settled(wheel, list) {
      const idx = Math.min(Math.max(0, Math.round(wheel.scrollTop / ITEM_H)), list.length - 1);
      markActive(wheel, idx);
      return list[idx];
    }

    const emit = () => { if (typeof onChange === 'function') onChange(`${hour}:${min}`); };

    function settleHour() {
      const newHour = settled(hWheel, HOURS);
      if (newHour !== hour) {
        hour = newHour;
        rebuildMinutes();   // the hour gates which minutes exist
      }
      emit();
    }

    function settleMinute() {
      min = settled(mWheel, minutesFor(hour));
      emit();
    }

    function rebuildMinutes() {
      const list = minutesFor(hour);
      if (!list.includes(min)) min = list[0];
      fillWheel(mWheel, list);
      requestAnimationFrame(() => place(mWheel, list, min));
    }

    // ── Scroll-settle wiring (scrollend where supported, debounce fallback) ──
    function wire(wheel, settle) {
      let timer = null;
      wheel.addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(settle, 120); }, { passive: true });
      wheel.addEventListener('scrollend', settle);
      // Tap an option to bring it to centre.
      wheel.addEventListener('click', e => {
        const opt = e.target.closest('.tp-opt');
        if (!opt) return;
        scrollToIndex(wheel, [...wheel.querySelectorAll('.tp-opt')].indexOf(opt), true);
      });
    }

    function setValue(value) {
      const m = /^(\d{2}):(\d{2})$/.exec(value || '');
      if (m && HOURS.includes(m[1])) hour = m[1];
      const list = minutesFor(hour);
      min = (m && list.includes(m[2])) ? m[2] : list[0];
      fillWheel(mWheel, list);
      requestAnimationFrame(() => {
        place(hWheel, HOURS, hour);
        place(mWheel, list, min);
        emit();
      });
    }

    fillWheel(hWheel, HOURS);
    wire(hWheel, settleHour);
    wire(mWheel, settleMinute);
    setValue(initial);

    return { setValue };
  }

  window.RedaTimePicker = { create };
})();
