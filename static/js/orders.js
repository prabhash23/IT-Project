requireLogin();
const fmtDT = (iso) => new Date(iso).toLocaleString(undefined,
  { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  document.querySelectorAll('.tab-page').forEach(x => x.hidden = true);
  document.getElementById(t.dataset.tab).hidden = false;
}));

async function load() {
  const q = await api('/orders-queue/');
  document.getElementById('phCount').textContent = '(' + q.pharmacy.filter(o => o.status === 'placed').length + ' pending)';
  document.getElementById('blCount').textContent = '(' + q.blood.filter(o => o.status === 'placed').length + ' pending)';

  document.getElementById('pharmacy').innerHTML = q.pharmacy.length ? q.pharmacy.map(o => `
    <div class="entry">
      <div class="entry-head">
        <div><strong>${esc(o.medicine_name)}</strong>
          <span class="muted">${esc(o.form)} ${esc(o.strength)} × ${o.quantity}</span>
          <div class="muted small">${esc(o.patient_name)} · Bed ${esc(o.bed_no)} · ${esc(o.ward_code)}
            · by ${esc(o.placed_by)} · ${fmtDT(o.placed_at)}</div></div>
        <div class="row">
          <span class="badge">${esc(o.status)}</span>
          ${o.status === 'placed'
            ? `<button class="btn btn-primary" onclick="fulfill('pharmacy', ${o.id})">Mark dispensed</button>`
            : ''}
        </div>
      </div>
    </div>`).join('') : '<p class="muted">No pharmacy orders yet.</p>';

  document.getElementById('blood').innerHTML = q.blood.length ? q.blood.map(o => `
    <div class="entry">
      <div class="entry-head">
        <div><strong>${esc(o.blood_type)}</strong> · ${o.units} unit(s)
          <div class="muted small">${esc(o.patient_name)} · Bed ${esc(o.bed_no)} · ${esc(o.ward_code)}
            · by ${esc(o.placed_by)} · ${fmtDT(o.placed_at)}</div></div>
        <div class="row">
          <span class="badge">${esc(o.status)}</span>
          ${o.status === 'placed'
            ? `<button class="btn btn-primary" onclick="fulfill('blood', ${o.id})">Mark fulfilled</button>`
            : ''}
        </div>
      </div>
    </div>`).join('') : '<p class="muted">No blood orders yet.</p>';
}

async function fulfill(kind, orderId) {
  await api('/orders/' + kind + '/' + orderId + '/', {
    method: 'POST',
    body: JSON.stringify({ status: kind === 'pharmacy' ? 'dispensed' : 'fulfilled' }),
  });
  load();
}

load();