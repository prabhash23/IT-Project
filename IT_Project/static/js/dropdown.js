// buildDropdown(container, options, placeholder, onSelect)
// options: [{ value: '3', label: 'Dr. Priya Nair — Pulmonology' }]
function buildDropdown(container, options, placeholder, onSelect) {
  container.innerHTML = `
    <div class="combobox">
      <button type="button" class="combobox-btn">
        <span class="combobox-btn-text">${placeholder}</span>
        <svg class="combobox-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="combobox-panel" hidden>
        <div class="combobox-search-wrap">
          <svg class="combobox-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input class="combobox-search" placeholder="Type 2-3 letters to filter..." autocomplete="off" />
        </div>
        <ul class="combobox-list" role="listbox"></ul>
      </div>
    </div>`;

  const btn    = container.querySelector('.combobox-btn');
  const btnTxt = container.querySelector('.combobox-btn-text');
  const panel  = container.querySelector('.combobox-panel');
  const search = container.querySelector('.combobox-search');
  const list   = container.querySelector('.combobox-list');

  let chosen = '';
  let activeIdx = 0;       // tracks keyboard / hover highlight index
  let filtered = [];       // current filtered options array

  // ---------- render list ----------
  function render(filter) {
    const q = (filter || '').toLowerCase().trim();
    filtered = q.length >= 1
      ? options.filter(o => o.label.toLowerCase().includes(q))
      : options.slice();   // show all when empty

    if (!filtered.length) {
      list.innerHTML = '<li class="combobox-empty">No results found.</li>';
      activeIdx = -1;
      return;
    }

    // First item pre-highlighted (amber) on open; subsequent hovers change highlight
    list.innerHTML = filtered.map((o, i) =>
      `<li role="option" data-value="${o.value}" data-idx="${i}" class="combobox-item${i === 0 && !q ? ' combobox-item-first' : ''}">
        ${escDrop(o.label)}
      </li>`
    ).join('');

    activeIdx = 0;
    setActive(0);
  }

  function escDrop(s) {
    return String(s ?? '').replace(/[&<>"]/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function setActive(idx) {
    const items = list.querySelectorAll('.combobox-item');
    items.forEach((el, i) => {
      el.classList.toggle('combobox-item-active', i === idx);
    });
    const active = items[idx];
    if (active) active.scrollIntoView({ block: 'nearest' });
    activeIdx = idx;
  }

  // ---------- open / close ----------
  function openPanel() {
    panel.hidden = false;
    render(search.value);
    search.focus();
    btn.classList.add('combobox-btn-open');
  }

  function closePanel() {
    panel.hidden = true;
    btn.classList.remove('combobox-btn-open');
  }

  // ---------- events ----------
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden ? openPanel() : closePanel();
  });

  search.addEventListener('input', () => render(search.value));

  // Keyboard navigation
  search.addEventListener('keydown', (e) => {
    const items = list.querySelectorAll('.combobox-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(Math.min(activeIdx + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(activeIdx - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const active = items[activeIdx];
      if (active) selectItem(active.dataset.value, active.textContent.trim());
    } else if (e.key === 'Escape') {
      closePanel();
    }
  });

  // Click in list
  list.addEventListener('click', (e) => {
    const li = e.target.closest('.combobox-item[data-value]');
    if (!li) return;
    selectItem(li.dataset.value, li.textContent.trim());
  });

  // Hover highlight
  list.addEventListener('mouseover', (e) => {
    const li = e.target.closest('.combobox-item[data-value]');
    if (!li) return;
    setActive(Number(li.dataset.idx));
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) closePanel();
  }, true);

  function selectItem(value, label) {
    chosen = value;
    btnTxt.textContent = label;
    closePanel();
    onSelect(chosen);
  }
}
