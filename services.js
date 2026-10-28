/* ── R-EDA'S STUDIO — services ─────────────────────────────
 * One list for the booking form, the admin form and the server's checks.
 * It mirrors the price list in index.html; a test keeps names and prices
 * in step. A booking stores its picks as "Category: Name" strings.
 *
 * Rules: a client must pick at least one main service; an add-on
 * (French, Design, Acrigel) only counts next to a main service of its own
 * category; a `single` category allows one pick.
 */
(function (root) {
  'use strict';

  const SERVICES = [
    { category: 'Manikyr', items: [
      { name: 'Rimbushje xheli',        price: '1200' },
      { name: 'Manikyr xhel/BIAB',      price: '1000' },
      { name: 'Tipsa',                  price: '1500' },
      { name: 'Heqje xheli',            price: '300' },
      { name: 'French',                 price: '+200',  addon: true },
      { name: 'Design',                 price: 'EXTRA', addon: true },
    ] },
    { category: 'Pedikyr', items: [
      { name: 'Manikyr xhel',           price: '1200' },
      { name: 'Shtim me acrigel',       price: '+100',  addon: true },
      { name: 'Trajtim këmbësh',        price: '1500' },
      { name: 'Heqje xheli',            price: '300' },
      { name: 'Trajtim + manikyr xhel', price: '2200' },
    ] },
    { category: 'Make-Up', single: true, items: [
      { name: 'Natural make-up',        price: '2000–3000' },
      { name: 'Professional make-up',   price: '3500–4500' },
      { name: 'Bridal make-up',         price: '5000–8000' },
      { name: 'Trial make-up (bridal)', price: '2000–3000' },
    ] },
  ];

  const keyOf = (category, name) => `${category}: ${name}`;
  const ITEMS = new Map();   // "Category: Name" → { category, single, ...item }
  for (const { category, single, items } of SERVICES) {
    for (const item of items) ITEMS.set(keyOf(category, item.name), { category, single, ...item });
  }

  // Returns an error string, or '' when the picks are acceptable.
  // `required` = at least one main service (the public form; optional for admin).
  function check(picks, { required = true } = {}) {
    if (!Array.isArray(picks)) return 'Invalid services';
    if (new Set(picks).size !== picks.length) return 'Invalid services';
    const chosen = picks.map(p => ITEMS.get(p));
    if (chosen.some(c => !c)) return 'Unknown service';
    const mains = chosen.filter(c => !c.addon);
    if (required && !mains.length) return 'No service';
    for (const c of chosen) {
      if (c.addon && !mains.some(m => m.category === c.category)) return 'Add-on without service';
      if (c.single && chosen.filter(o => o.category === c.category).length > 1) return 'Too many services';
    }
    return '';
  }

  // "Manikyr: Tipsa + French · Pedikyr: Trajtim këmbësh"
  function summary(picks) {
    const byCat = new Map();
    for (const p of picks || []) {
      const i = p.indexOf(': ');
      const cat = i > 0 ? p.slice(0, i) : '';
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(i > 0 ? p.slice(i + 2) : p);
    }
    return [...byCat].map(([cat, names]) => (cat ? `${cat}: ` : '') + names.join(' + ')).join(' · ');
  }

  // ── Picker (browser only) ─────────────────────────────────
  // Renders one collapsible group per category into `host`. Add-ons appear
  // once a main service of their category is ticked. Returns
  // { value(), reset() }; onChange fires with the current picks.
  function mount(host, { onChange = () => {} } = {}) {
    const esc = s => String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const row = (category, item) => `
      <label class="svc-row${item.addon ? ' svc-row--addon' : ''}">
        <input type="checkbox" value="${esc(keyOf(category, item.name))}">
        <span class="svc-name">${item.addon ? '+ ' : ''}${esc(item.name)}</span>
        <span class="svc-price">${esc(item.price)}</span>
      </label>`;

    host.innerHTML = SERVICES.map(({ category, single, items }) => `
      <div class="svc-group" data-category="${esc(category)}">
        <button type="button" class="svc-head" aria-expanded="false">
          <span class="svc-cat">${esc(category)}</span>
          <span class="svc-count"></span>
        </button>
        <div class="svc-body" hidden>
          ${single ? '<p class="svc-note">Zgjidhni një</p>' : ''}
          ${items.filter(i => !i.addon).map(i => row(category, i)).join('')}
          <div class="svc-addons" hidden>${items.filter(i => i.addon).map(i => row(category, i)).join('')}</div>
        </div>
      </div>`).join('');

    const boxes = () => [...host.querySelectorAll('input[type="checkbox"]')];
    const value = () => boxes().filter(b => b.checked).map(b => b.value);

    function sync(group) {
      const mains  = [...group.querySelectorAll('.svc-row:not(.svc-row--addon) input')];
      const addons = [...group.querySelectorAll('.svc-addons input')];
      const hasMain = mains.some(b => b.checked);
      const wrap = group.querySelector('.svc-addons');
      if (wrap) wrap.hidden = !hasMain || !addons.length;
      if (!hasMain) addons.forEach(b => { b.checked = false; });
      const n = mains.concat(addons).filter(b => b.checked).length;
      group.querySelector('.svc-count').textContent = n ? `${n} zgjedhur` : '';
      group.classList.toggle('svc-group--picked', n > 0);
    }

    host.addEventListener('click', e => {
      const head = e.target.closest('.svc-head');
      if (!head) return;
      const body = head.nextElementSibling;
      body.hidden = !body.hidden;
      head.setAttribute('aria-expanded', String(!body.hidden));
    });

    host.addEventListener('change', e => {
      const box = e.target;
      const group = box.closest('.svc-group');
      const cat = SERVICES.find(s => s.category === group.dataset.category);
      if (cat.single && box.checked) {
        group.querySelectorAll('input').forEach(b => { if (b !== box) b.checked = false; });
      }
      sync(group);
      onChange(value());
    });

    function reset() {
      boxes().forEach(b => { b.checked = false; });
      host.querySelectorAll('.svc-group').forEach(g => {
        sync(g);
        g.querySelector('.svc-body').hidden = true;
        g.querySelector('.svc-head').setAttribute('aria-expanded', 'false');
      });
    }

    reset();
    return { value, reset };
  }

  const api = { SERVICES, check, summary, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RedaServices = api;
})(typeof window !== 'undefined' ? window : globalThis);
