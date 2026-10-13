const staff = requireLogin();
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const MAX_UNITS = 20;

async function load() {
  const boot = await api('/bootstrap/');
  document.getElementById('stock').innerHTML = boot.bloodStock.map(b => {
    const pct = Math.min(100, Math.round((b.units_available / MAX_UNITS) * 100));
    const level = pct < 15 ? 'card-critical' : pct < 35 ? 'card-serious' : 'card-stable';
    const levelLabel = pct < 15 ? 'LOW' : pct < 35 ? 'MEDIUM' : 'OK';
    return `
      <div class="card">
        <div class="card-head">
          <strong style="font-size:18px">${esc(b.blood_type)}</strong>
          <span class="badge">${b.units_available} units · ${levelLabel}</span>
        </div>
        <div class="bar"><span style="width:${pct}%"></span></div>
        ${staff.role === 'admin' ? `
          <div class="row" style="margin-top:8px">
            <input id="stock-${b.id}" inputmode="numeric" value="${b.units_available}" style="max-width:90px" />
            <button class="btn" onclick="restock(${b.id})">Restock</button>
          </div>` : ''}
      </div>`;
  }).join('');
}

async function restock(id) {
  const units = Number(document.getElementById('stock-' + id).value);
  if (Number.isNaN(units) || units < 0) return;
  await api('/blood-stock/' + id + '/', {
    method: 'POST',
    body: JSON.stringify({ unitsAvailable: units }),
  });
  load();
}

document.getElementById('refresh').onclick = load;
load();
