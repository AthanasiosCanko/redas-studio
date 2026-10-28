/* ── R-EDA'S STUDIO — services ─────────────────────────────
 * What a client can book, shared by the booking form, the admin form and
 * the server's checks. The names match the price-list categories in
 * index.html (a test keeps them in step). Manikyr and Pedikyr each take an
 * optional Trajtim (treatment) extra.
 *
 * A booking stores its picks as an array: the service names, plus
 * "Service: Extra" for each extra, e.g. ['Manikyr', 'Manikyr: Trajtim'].
 */
(function (root) {
  'use strict';

  const SERVICES = [
    { name: 'Manikyr', extras: ['Trajtim'] },
    { name: 'Pedikyr', extras: ['Trajtim'] },
    { name: 'Make-Up', extras: [] },
  ];

  const extraKey = (service, extra) => `${service}: ${extra}`;
  const NAMES  = SERVICES.map(s => s.name);
  const EXTRAS = new Map(SERVICES.flatMap(s => s.extras.map(e => [extraKey(s.name, e), s.name])));

  // Returns an error string, or '' when the picks are acceptable.
  // `required` = at least one service (the public form; optional for admin).
  function check(picks, { required = true } = {}) {
    if (!Array.isArray(picks)) return 'Invalid services';
    if (new Set(picks).size !== picks.length) return 'Invalid services';
    if (picks.some(p => !NAMES.includes(p) && !EXTRAS.has(p))) return 'Unknown service';
    if (required && !picks.some(p => NAMES.includes(p))) return 'No service';
    if (picks.some(p => EXTRAS.has(p) && !picks.includes(EXTRAS.get(p)))) return 'Extra without service';
    return '';
  }

  // "Manikyr me trajtim + Pedikyr". Anything unrecognised (older bookings)
  // is listed as stored.
  function summary(picks) {
    const list = picks || [];
    const parts = list.filter(p => !EXTRAS.has(p)).map(p => {
      const s = SERVICES.find(x => x.name === p);
      const extras = s ? s.extras.filter(e => list.includes(extraKey(p, e))) : [];
      return p + extras.map(e => ` me ${e.toLowerCase()}`).join('');
    });
    return parts.join(' + ');
  }

  // ── Picker (browser only) ─────────────────────────────────
  // One row per service: its checkbox, then a "+ extra" checkbox that is
  // live only while the service is ticked. Returns { value(), reset() };
  // onChange fires with the current picks.
  function mount(host, { onChange = () => {} } = {}) {
    host.innerHTML = SERVICES.map(({ name, extras }) => `
      <div class="svc-item">
        <label class="svc-row">
          <input type="checkbox" value="${name}">
          <span class="svc-name">${name}</span>
        </label>
        ${extras.map(e => `
        <label class="svc-row svc-row--extra">
          <input type="checkbox" value="${extraKey(name, e)}" disabled>
          <span class="svc-name">+ ${e}</span>
        </label>`).join('')}
      </div>`).join('');

    const boxes = [...host.querySelectorAll('input')];
    const value = () => boxes.filter(b => b.checked).map(b => b.value);

    // An extra follows its service: off and disabled while it is unticked
    function sync() {
      for (const item of host.querySelectorAll('.svc-item')) {
        const [main, ...extras] = item.querySelectorAll('input');
        extras.forEach(b => { b.disabled = !main.checked; if (!main.checked) b.checked = false; });
      }
    }

    host.addEventListener('change', () => { sync(); onChange(value()); });
    const reset = () => { boxes.forEach(b => { b.checked = false; }); sync(); };

    return { value, reset };
  }

  const api = { SERVICES, check, summary, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RedaServices = api;
})(typeof window !== 'undefined' ? window : globalThis);
