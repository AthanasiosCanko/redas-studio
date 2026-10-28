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
  // Tabs, one category shown at a time, so the form keeps one height
  // whatever is picked. Each tab counts its picks; add-ons are chips that
  // switch on once a main service of their category is ticked; a line under
  // the tabs lists everything picked across them. Returns
  // { value(), reset() }; onChange fires with the current picks.
  function mount(host, { onChange = () => {} } = {}) {
    const esc = s => String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const uid = `svc${Math.random().toString(36).slice(2, 8)}`;

    host.innerHTML = `
      <div class="svc-tabs" role="tablist">${SERVICES.map(({ category }, i) => `
        <button type="button" class="svc-tab" role="tab" id="${uid}-t${i}" aria-controls="${uid}-p${i}">
          ${esc(category)}<span class="svc-count"></span>
        </button>`).join('')}
      </div>
      ${SERVICES.map(({ category, single, items }, i) => `
      <div class="svc-panel${single ? ' svc-panel--single' : ''}" role="tabpanel" id="${uid}-p${i}" aria-labelledby="${uid}-t${i}" data-category="${esc(category)}">
        ${items.filter(it => !it.addon).map(it => `
        <label class="svc-row">
          <input type="checkbox" value="${esc(keyOf(category, it.name))}">
          <span class="svc-name">${esc(it.name)}</span>
          <span class="svc-price">${esc(it.price)}</span>
        </label>`).join('')}
        ${items.some(it => it.addon) ? `
        <div class="svc-addons">${items.filter(it => it.addon).map(it => `
          <label class="svc-chip">
            <input type="checkbox" value="${esc(keyOf(category, it.name))}">+ ${esc(it.name)} <span class="svc-price">${esc(it.price)}</span>
          </label>`).join('')}
        </div>` : ''}
      </div>`).join('')}
      <p class="svc-picked" hidden></p>`;

    const tabs   = [...host.querySelectorAll('.svc-tab')];
    const panels = [...host.querySelectorAll('.svc-panel')];
    const picked = host.querySelector('.svc-picked');
    const boxes  = () => [...host.querySelectorAll('input[type="checkbox"]')];
    const value  = () => boxes().filter(b => b.checked).map(b => b.value);

    function show(i) {
      tabs.forEach((t, j) => {
        t.setAttribute('aria-selected', String(i === j));
        t.tabIndex = i === j ? 0 : -1;
      });
      panels.forEach((p, j) => { p.hidden = i !== j; });
    }

    function sync() {
      panels.forEach((panel, i) => {
        const mains  = [...panel.querySelectorAll('.svc-row input')];
        const addons = [...panel.querySelectorAll('.svc-chip input')];
        const hasMain = mains.some(b => b.checked);
        addons.forEach(b => { b.disabled = !hasMain; if (!hasMain) b.checked = false; });
        const n = mains.concat(addons).filter(b => b.checked).length;
        tabs[i].querySelector('.svc-count').textContent = n ? ` · ${n}` : '';
      });
      const picks = value();
      picked.hidden = !picks.length;
      picked.textContent = summary(picks);
    }

    host.addEventListener('click', e => {
      const tab = e.target.closest('.svc-tab');
      if (tab) show(tabs.indexOf(tab));
    });
    host.addEventListener('keydown', e => {
      const i = tabs.indexOf(e.target);
      if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      const next = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      show(next);
      tabs[next].focus();
    });

    host.addEventListener('change', e => {
      const box = e.target;
      const panel = box.closest('.svc-panel');
      if (panel.classList.contains('svc-panel--single') && box.checked) {
        panel.querySelectorAll('input').forEach(b => { if (b !== box) b.checked = false; });
      }
      sync();
      onChange(value());
    });

    function reset() {
      boxes().forEach(b => { b.checked = false; });
      sync();
      show(0);
    }

    reset();
    return { value, reset };
  }

  const api = { SERVICES, check, summary, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RedaServices = api;
})(typeof window !== 'undefined' ? window : globalThis);
