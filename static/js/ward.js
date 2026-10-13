const staff = requireLogin();

const SEVERITY = {
  critical: { label: 'CRITICAL', cls: 'card-critical', pillCls: 'pill-critical' },
  serious:  { label: 'SERIOUS',  cls: 'card-serious',  pillCls: 'pill-serious'  },
  stable:   { label: 'STABLE',   cls: 'card-stable',   pillCls: 'pill-stable'   },
};
const ICU_WARD_ID = 3;   // matches mysql-schema.sql seed

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

async function load() {
  const data = await api('/ward-patients/' + ICU_WARD_ID + '/');
  document.getElementById('patients').innerHTML = data.patients.map(p => {
    const sev = SEVERITY[p.condition_flag] || SEVERITY.stable;
    const sexFormatted = p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : 'Other';
    const admitDate = fmtDate(p.admission_date);
    return `
      <div class="card ${sev.cls}" onclick="location.href='/patient/${p.id}/'">
        <div class="card-head">
          <strong class="patient-name">${esc(p.name)}</strong>
          <span class="bed-pill">🛏 ${esc(p.bed_no)}</span>
        </div>
        <div class="pill-wrap">
          <span class="pill ${sev.pillCls}">${sev.label}</span>
        </div>
        <div class="card-meta">${p.age} yrs · ${sexFormatted}</div>
        <div class="card-meta">Admitted ${admitDate}</div>
        <div class="card-reason">${esc(p.reason)}</div>
        ${p.open_tests ? `<div class="pending-wrap"><span class="badge badge-pending">🔬 ${p.open_tests} test${p.open_tests > 1 ? 's' : ''} pending result</span></div>` : ''}
      </div>`;
  }).join('');
}

// Modal handling
const dlg = document.getElementById('admitDialog');
const cancelBtn = document.getElementById('admitCancel');
const admitBtn = document.getElementById('admitBtn');
const saveBtn = document.getElementById('admitSave');

if (cancelBtn) {
  cancelBtn.onclick = () => { dlg.hidden = true; };
}

if (dlg) {
  dlg.onclick = (e) => {
    if (e.target === dlg) dlg.hidden = true;
  };
}

// Admit — admin only
if (staff && staff.role === 'admin') {
  if (admitBtn) {
    admitBtn.hidden = false;
    admitBtn.onclick = () => { dlg.hidden = false; };
  }
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const errEl = document.getElementById('admitError');
      errEl.hidden = true;
      const nameEl = document.getElementById('adName');
      const ageEl = document.getElementById('adAge');
      const sexEl = document.getElementById('adSex');
      const bedEl = document.getElementById('adBed');
      const reasonEl = document.getElementById('adReason');

      if (!nameEl.value.trim() || !ageEl.value || !bedEl.value.trim() || !reasonEl.value.trim()) {
        errEl.textContent = 'Please fill out all fields.';
        errEl.hidden = false;
        return;
      }

      const result = await api('/admit/', { method: 'POST', body: JSON.stringify({
        name: nameEl.value.trim(),
        age: Number(ageEl.value),
        sex: sexEl.value,
        wardId: ICU_WARD_ID,
        bedNo: bedEl.value.trim(),
        reason: reasonEl.value.trim(),
      })});

      if (result.ok) {
        dlg.hidden = true;
        nameEl.value = '';
        ageEl.value = '';
        bedEl.value = '';
        reasonEl.value = '';
        load();
      } else {
        errEl.textContent = result.error || 'Could not admit.';
        errEl.hidden = false;
      }
    };
  }
} else if (dlg) {
  dlg.hidden = true;
}

load();