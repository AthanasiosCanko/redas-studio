/* ── R-EDA'S STUDIO — services ─────────────────────────────
 * The three things a client can book, shared by the booking form, the
 * admin form and the server's checks. They match the price-list
 * categories in index.html (a test keeps them in step). A booking stores
 * its picks as an array of these names.
 */
(function (root) {
  'use strict';

  const SERVICES = ['Manikyr', 'Pedikyr', 'Make-Up'];

  // Returns an error string, or '' when the picks are acceptable.
  // `required` = at least one pick (the public form; optional for admin).
  function check(picks, { required = true } = {}) {
    if (!Array.isArray(picks)) return 'Invalid services';
    if (new Set(picks).size !== picks.length) return 'Invalid services';
    if (picks.some(p => !SERVICES.includes(p))) return 'Unknown service';
    if (required && !picks.length) return 'No service';
    return '';
  }

  // "Manikyr + Pedikyr"
  const summary = picks => (picks || []).join(' + ');

  // ── Picker (browser only) ─────────────────────────────────
  // One checkbox per service in `host`. Returns { value(), reset() };
  // onChange fires with the current picks.
  function mount(host, { onChange = () => {} } = {}) {
    host.innerHTML = SERVICES.map(name => `
      <label class="svc-row">
        <input type="checkbox" value="${name}">
        <span class="svc-name">${name}</span>
      </label>`).join('');

    const boxes = [...host.querySelectorAll('input')];
    const value = () => boxes.filter(b => b.checked).map(b => b.value);
    host.addEventListener('change', () => onChange(value()));
    const reset = () => boxes.forEach(b => { b.checked = false; });

    return { value, reset };
  }

  const api = { SERVICES, check, summary, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RedaServices = api;
})(typeof window !== 'undefined' ? window : globalThis);
