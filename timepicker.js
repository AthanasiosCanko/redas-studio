/* ── R-EDA'S STUDIO — wheel time picker ──────────────────
 * iOS-style scroll wheels for hours (09–20) and minutes (00–55, step 5).
 * Vanilla JS, no deps. Shared by the public booking modal and the admin modal.
 *
 *   const tp = RedaTimePicker.create(containerEl, { initial: '10:00', onChange });
 *   tp.getValue();        // "HH:MM"
 *   tp.setValue('14:30');
 */
(() => {
  'use strict';

  const ITEM_H  = 40;   // px per row — must match .tp-opt height in CSS
  const VISIBLE = 5;    // visible rows (odd) — must match .tp-wheel height in CSS
  const PAD     = Math.floor(VISIBLE / 2);

  const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 9).padStart(2, '0')); // 09..20
  const MINS  = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // 00..55

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

    // 20:00 is the last bookable time, so only :00 is valid at hour 20.
    const minutesFor = h => (h === '20' ? ['00'] : MINS);

    function fillWheel(wheel, list) {
      wheel.innerHTML =
        `<div class="tp-spacer"></div>` +
        list.map(v => `<button type="button" class="tp-opt" data-val="${v}">${v}</button>`).join('') +
        `<div class="tp-spacer"></div>`;
    }

    function indexFromScroll(wheel) {
      return Math.max(0, Math.round(wheel.scrollTop / ITEM_H));
    }

    function markActive(wheel, idx) {
      wheel.querySelectorAll('.tp-opt').forEach((el, i) =>
        el.classList.toggle('tp-opt--active', i === idx));
    }

    function scrollToIndex(wheel, idx, smooth) {
      wheel.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
    }

    // ── Hours ──
    fillWheel(hWheel, HOURS);

    function settleHour() {
      const list = HOURS;
      const idx  = Math.min(indexFromScroll(hWheel), list.length - 1);
      markActive(hWheel, idx);
      const newHour = list[idx];
      if (newHour !== hour) {
        hour = newHour;
        rebuildMinutes();
      }
      emit();
    }

    // ── Minutes (rebuilt when the hour gates them) ──
    function rebuildMinutes() {
      const list = minutesFor(hour);
      if (!list.includes(min)) min = list[0];
      fillWheel(mWheel, list);
      requestAnimationFrame(() => {
        scrollToIndex(mWheel, list.indexOf(min), false);
        markActive(mWheel, list.indexOf(min));
      });
    }

    function settleMinute() {
      const list = minutesFor(hour);
      const idx  = Math.min(indexFromScroll(mWheel), list.length - 1);
      markActive(mWheel, idx);
      min = list[idx];
      emit();
    }

    function emit() {
      if (typeof onChange === 'function') onChange(`${hour}:${min}`);
    }

    // ── Scroll-settle wiring (scrollend where supported, debounce fallback) ──
    function wire(wheel, settle) {
      let timer = null;
      const debounced = () => { clearTimeout(timer); timer = setTimeout(settle, 120); };
      wheel.addEventListener('scroll', debounced, { passive: true });
      wheel.addEventListener('scrollend', settle);
      // Tap an option to bring it to centre.
      wheel.addEventListener('click', e => {
        const opt = e.target.closest('.tp-opt');
        if (!opt) return;
        const idx = [...wheel.querySelectorAll('.tp-opt')].indexOf(opt);
        scrollToIndex(wheel, idx, true);
      });
    }
    wire(hWheel, settleHour);
    wire(mWheel, settleMinute);

    function setValue(value) {
      const m = /^(\d{2}):(\d{2})$/.exec(value || '');
      if (m && HOURS.includes(m[1])) hour = m[1];
      const list = minutesFor(hour);
      min = (m && list.includes(m[2])) ? m[2] : list[0];
      fillWheel(mWheel, list);
      requestAnimationFrame(() => {
        scrollToIndex(hWheel, HOURS.indexOf(hour), false);
        scrollToIndex(mWheel, list.indexOf(min), false);
        markActive(hWheel, HOURS.indexOf(hour));
        markActive(mWheel, list.indexOf(min));
        emit();
      });
    }

    setValue(initial);

    return {
      getValue: () => `${hour}:${min}`,
      setValue,
    };
  }

  window.RedaTimePicker = { create };
})();
