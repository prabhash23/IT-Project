const staff = requireLogin();
const patientId = Number(window.location.pathname.split('/').filter(Boolean).pop());
let master = null;      // doctors, medicines, tests, bloodStock (from /bootstrap/)
let currentCase = null; // the loaded patient case

const isNurse = staff && staff.role === 'nurse';
const isDoctor = staff && staff.role === 'doctor';
const isAdmin = staff && staff.role === 'admin';

const canRecordVisits = true;                         // Nurse, Doctor, Admin can record doctor visits
const canPrescribeMeds = isDoctor || isAdmin;         // Doctor, Admin prescribe medicines
const canOrderSupplies = isNurse || isAdmin;          // Nurse, Admin order medicines & blood to pharmacy
const canOrderTests = isNurse || isDoctor || isAdmin; // Nurse, Doctor, Admin order tests
const canEnterTestResults = isDoctor || isAdmin;      // Doctor, Admin enter lab results
const canDischarge = isDoctor || isAdmin;             // Doctor, Admin can discharge patient
const canUpdateStatus = isDoctor || isAdmin;          // Doctor, Admin can update condition

// ---------- helpers ----------
const fmtDT = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cap = (s) => s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase() : '';

const SEVERITY = {
  critical: { label: 'CRITICAL', cls: 'card-critical', pillCls: 'pill-critical' },
  serious:  { label: 'SERIOUS',  cls: 'card-serious',  pillCls: 'pill-serious'  },
  stable:   { label: 'STABLE',   cls: 'card-stable',   pillCls: 'pill-stable'   },
};

async function load() {
  try {
    [master, currentCase] = await Promise.all([
      api('/bootstrap/'),
      api('/patient/' + patientId + '/'),
    ]);
    renderHead();
    renderVisits();
    renderPrescriptions();
    renderTests();
    renderNotes();
    renderOrders();
    setupDialogs();
    setupCaseSummary();
  } catch (err) {
    console.error('Failed to load patient case:', err);
    const headEl = document.getElementById('head');
    if (headEl) {
      headEl.innerHTML = `<div class="error-box" style="padding:16px; color:#ef4444;">Error loading patient details: ${esc(err.message)}</div>`;
    }
  }
}

// ---------- Header & Demographics ----------
function renderHead() {
  const p = currentCase.patient;
  const sev = SEVERITY[p.condition_flag] || SEVERITY.stable;
  const flagCls = sev.pillCls;
  const sexFormatted = p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : 'Other';
  const admitFormatted = fmtDate(p.admission_date);

  document.getElementById('head').innerHTML = `
    <div class="patient-title-row">
      <h2 class="patient-name">${esc(p.name)}</h2>
      <span class="bed-pill">Bed ${esc(p.bed_no)}</span>
      <span class="ward-pill">${esc(p.ward_code || 'ICU')}</span>
      <span class="pill ${flagCls}">${p.condition_flag.toUpperCase()}</span>
    </div>
    <p class="muted patient-subline">${p.age} yrs &bull; ${sexFormatted} &bull; Admitted ${admitFormatted} &mdash; ${esc(p.reason)}</p>
  `;
}

// ---------- Tabs switching ----------
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  document.querySelectorAll('.tab-page').forEach(x => x.hidden = true);
  document.getElementById(t.dataset.tab).hidden = false;
}));

// ---------- 1. Doctor Visits ----------
function renderVisits() {
  const box = document.getElementById('visits');
  const form = canRecordVisits ? `
    <div class="entry form-card">
      <div class="row" style="gap:10px; align-items:center; flex-wrap:wrap;">
        <select id="visitDoctorSelect" class="custom-select" style="flex:1; min-width:260px;">
          <option value="">Pick visiting doctor...</option>
          ${master.doctors.map(d => `<option value="${d.id}">${esc(d.name)} &mdash; ${esc(d.specialty)}</option>`).join('')}
        </select>
        <button id="visitSave" class="btn btn-primary">Add visit</button>
      </div>
      <textarea id="visitNotes" rows="2" placeholder="Visit findings / plan..." style="margin-top:8px;"></textarea>
      <p id="visitError" class="error" hidden></p>
    </div>` : '';

  box.innerHTML = form + (currentCase.visits.length ? currentCase.visits.map(v => `
    <div class="entry">
      <div class="entry-head">
        <strong>${esc(v.doctor_name)}</strong>
        <span class="muted small">${fmtDT(v.visit_at)}</span>
      </div>
      <div style="margin: 6px 0;">${esc(v.notes)}</div>
      <div class="muted small">${esc(v.specialty)} &bull; Recorded by ${esc(v.recorded_by)}</div>
    </div>`).join('') : '<p class="muted" style="padding:12px;">No doctor visits recorded yet.</p>');

  if (canRecordVisits) {
    document.getElementById('visitSave').onclick = async () => {
      const docSel = document.getElementById('visitDoctorSelect').value;
      const notesEl = document.getElementById('visitNotes');
      const err = document.getElementById('visitError');
      err.hidden = true;
      if (!docSel || !notesEl.value.trim()) {
        err.textContent = 'Please pick a doctor and enter visit findings / notes.';
        err.hidden = false;
        return;
      }
      await api('/visits/', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          doctorId: Number(docSel),
          notes: notesEl.value.trim(),
          recordedBy: staff.name || staff.username
        })
      });
      load();
    };
  }
}

// ---------- 2. Medicines ----------
function renderPrescriptions() {
  const box = document.getElementById('prescriptions');
  let formHtml = '';

  if (canPrescribeMeds) {
    // Doctor / Admin: Prescribe medicine
    formHtml = `
      <div class="entry form-card">
        <p style="margin:0 0 10px; font-weight:600;">Prescribe Medication (Doctor)</p>
        <div class="row" style="flex-wrap:wrap; gap:8px;">
          <select id="rxMedicineSelect" class="custom-select" style="flex:1; min-width:220px;">
            <option value="">Pick medicine...</option>
            ${master.medicines.map(m => `<option value="${m.id}">${esc(m.label)}</option>`).join('')}
          </select>
          <input id="rxDosage" placeholder="Dosage (e.g. 1 tab / 1 g IV)" style="max-width:180px;" />
          <input id="rxFreq" placeholder="Frequency (e.g. TDS / BD)" style="max-width:140px;" />
          <input id="rxDays" inputmode="numeric" placeholder="Days" style="max-width:80px;" />
          <button id="rxSave" class="btn btn-primary">Prescribe</button>
        </div>
        <p id="rxError" class="error" hidden></p>
      </div>`;
  } else if (canOrderSupplies) {
    // Nurse: Order medicine to pharmacy
    formHtml = `
      <div class="entry form-card">
        <p style="margin:0 0 10px; font-weight:600;">Order Medicine to Pharmacy (Nurse)</p>
        <div class="row" style="gap:8px;">
          <select id="rxOrderMedSelect" class="custom-select" style="flex:1;">
            <option value="">Pick medicine...</option>
            ${master.medicines.map(m => `<option value="${m.id}">${esc(m.label)}</option>`).join('')}
          </select>
          <input id="rxOrderQty" type="number" min="1" value="1" placeholder="Qty" style="max-width:80px;" />
          <button id="rxOrderSave" class="btn btn-primary">Send to pharmacy</button>
        </div>
        <p id="rxOrderError" class="error" hidden></p>
      </div>`;
  }

  const prescribedList = `
    <h3 style="font-size:15px; margin: 18px 0 8px;">Prescribed Medications (${currentCase.prescriptions.length})</h3>
    ${currentCase.prescriptions.length ? currentCase.prescriptions.map(r => `
      <div class="entry">
        <div class="entry-head">
          <div>
            <strong>${esc(r.medicine_name)}</strong>
            <span class="muted small">${esc(r.form)} ${esc(r.strength)}</span>
            <div style="margin-top:4px;">${esc(r.dosage)} &bull; ${esc(r.frequency)} &bull; ${r.duration_days} day(s)</div>
            <div class="muted small">Prescribed by ${esc(r.prescribed_by)} &bull; ${fmtDT(r.prescribed_at)}</div>
          </div>
          <span class="badge ${r.status === 'active' ? 'badge-success' : ''}">${cap(r.status)}</span>
        </div>
      </div>`).join('') : '<p class="muted">No prescriptions recorded yet.</p>'}`;

  const orderedList = `
    <h3 style="font-size:15px; margin: 18px 0 8px;">Pharmacy Orders (${currentCase.pharmacyOrders.length})</h3>
    ${currentCase.pharmacyOrders.length ? currentCase.pharmacyOrders.map(o => `
      <div class="entry">
        <div class="entry-head">
          <div>
            <strong>${esc(o.medicine_name)}</strong>
            <span class="muted small">${esc(o.form)} ${esc(o.strength)} &times; ${o.quantity}</span>
            <div class="muted small">Ordered by ${esc(o.placed_by)} &bull; ${fmtDT(o.placed_at)}</div>
          </div>
          <span class="badge">${cap(o.status)}</span>
        </div>
      </div>`).join('') : '<p class="muted">No pharmacy orders placed yet.</p>'}`;

  box.innerHTML = formHtml + prescribedList + orderedList;

  if (canPrescribeMeds) {
    document.getElementById('rxSave').onclick = async () => {
      const sel = document.getElementById('rxMedicineSelect').value;
      const dosage = document.getElementById('rxDosage').value.trim();
      const freq = document.getElementById('rxFreq').value.trim();
      const days = Number(document.getElementById('rxDays').value) || 1;
      const err = document.getElementById('rxError');
      err.hidden = true;
      if (!sel || !dosage || !freq) {
        err.textContent = 'Please pick a medicine and fill dosage + frequency.';
        err.hidden = false;
        return;
      }
      await api('/prescriptions/', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          medicineId: Number(sel),
          dosage,
          frequency: freq,
          durationDays: days,
          prescribedBy: staff.name
        })
      });
      load();
    };
  } else if (canOrderSupplies) {
    document.getElementById('rxOrderSave').onclick = async () => {
      const sel = document.getElementById('rxOrderMedSelect').value;
      const qty = Number(document.getElementById('rxOrderQty').value) || 1;
      const err = document.getElementById('rxOrderError');
      err.hidden = true;
      if (!sel) {
        err.textContent = 'Please pick a medicine to order.';
        err.hidden = false;
        return;
      }
      await api('/pharmacy-orders/', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          medicineId: Number(sel),
          quantity: qty,
          placedBy: staff.name || staff.username
        })
      });
      load();
    };
  }
}

// ---------- 3. Tests & Results ----------
function renderTests() {
  const box = document.getElementById('tests');
  const form = canOrderTests ? `
    <div class="entry form-card">
      <div class="row" style="gap:8px;">
        <select id="testPickSelect" class="custom-select" style="flex:1;">
          <option value="">Pick a test to order...</option>
          ${master.tests.map(t => `<option value="${t.id}">${esc(t.name)} (${esc(t.category)})</option>`).join('')}
        </select>
        <button id="testSave" class="btn btn-primary">Order test</button>
      </div>
      <p id="testError" class="error" hidden></p>
    </div>` : '';

  box.innerHTML = form + (currentCase.testOrders.length ? currentCase.testOrders.map(o => `
    <div class="entry">
      <div class="entry-head">
        <div>
          <strong>${esc(o.test_name)}</strong>
          <span class="muted small">(${esc(o.category)})</span>
          <div class="muted small">Ordered by ${esc(o.ordered_by)} &bull; ${fmtDT(o.ordered_at)}</div>
        </div>
        <span class="badge ${o.status === 'ordered' ? 'badge-warning' : 'badge-success'}">
          ${o.status === 'ordered' ? 'Awaiting Result' : 'Result Available'}
        </span>
      </div>
      ${o.result_value ? `
        <div class="result-box" style="margin-top:8px;">
          <div style="font-weight:600;">${esc(o.result_value)}</div>
          ${o.result_notes ? `<div class="muted small" style="margin-top:2px;">${esc(o.result_notes)}</div>` : ''}
          <div class="muted small" style="margin-top:4px;">Reported by ${esc(o.result_by)} &bull; ${fmtDT(o.result_at)}</div>
        </div>` : canEnterTestResults ? `
        <div id="resultForm-${o.id}" hidden class="result-box" style="margin-top:8px;">
          <textarea id="resVal-${o.id}" rows="2" placeholder="Result findings (e.g. Hb 11.2 g/dL, WBC 14,000)"></textarea>
          <input id="resNote-${o.id}" placeholder="Remarks / Impression (optional)" style="margin-top:6px;" />
          <button class="btn btn-primary" style="margin-top:8px;" onclick="saveResult(${o.id})">Save result</button>
        </div>
        <button class="btn" style="margin-top:8px;" onclick="document.getElementById('resultForm-${o.id}').hidden = false; this.hidden = true;">Enter result</button>` : ''}
    </div>`).join('') : '<p class="muted">No laboratory tests ordered yet.</p>');

  if (canOrderTests) {
    document.getElementById('testSave').onclick = async () => {
      const sel = document.getElementById('testPickSelect').value;
      const err = document.getElementById('testError');
      err.hidden = true;
      if (!sel) {
        err.textContent = 'Please pick a test to order.';
        err.hidden = false;
        return;
      }
      await api('/test-orders/', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          testId: Number(sel),
          orderedBy: staff.name
        })
      });
      load();
    };
  }
}

async function saveResult(orderId) {
  const valEl = document.getElementById('resVal-' + orderId);
  const noteEl = document.getElementById('resNote-' + orderId);
  if (!valEl.value.trim()) return;
  await api('/test-results/', {
    method: 'POST',
    body: JSON.stringify({
      orderId,
      resultValue: valEl.value.trim(),
      notes: noteEl ? noteEl.value.trim() : '',
      recordedBy: staff.name
    })
  });
  load();
}

// ---------- 4. Nursing Notes ----------
function abnormalVitals(n) {
  const flags = [];
  const pulse = n.pulse || 0, spo2 = n.spo2 || 100, temp = Number(n.temp_c || 0), resp = n.resp || 0;
  const sys = Number((n.bp || '').split('/')[0]) || 0;
  if (pulse && (pulse > 100 || pulse < 50)) flags.push('Pulse ' + pulse);
  if (spo2 < 94) flags.push('SpO2 ' + spo2 + '%');
  if (temp && (temp >= 100.4 || temp < 96)) flags.push('Temp ' + temp + '&deg;F');
  if (resp && (resp > 24 || resp < 10)) flags.push('Resp ' + resp);
  if (sys && (sys >= 180 || sys < 90)) flags.push('BP ' + n.bp);
  return flags;
}

function renderNotes() {
  const box = document.getElementById('notes');
  const form = canOrderSupplies || isNurse || isAdmin ? `
    <div class="entry form-card">
      <textarea id="noteText" rows="2" placeholder="Nursing note..."></textarea>
      <div class="vitals-input-row">
        <input id="vBp" placeholder="BP (120/80)" />
        <input id="vPulse" inputmode="numeric" placeholder="Pulse" />
        <input id="vTemp" inputmode="decimal" placeholder="Temp (&deg;F)" />
        <input id="vSpo2" inputmode="numeric" placeholder="SpO2 %" />
        <input id="vResp" inputmode="numeric" placeholder="Resp" />
        <button id="noteSave" class="btn btn-primary btn-add-note">Add note</button>
      </div>
      <p id="noteError" class="error" hidden></p>
    </div>` : '';

  box.innerHTML = form + (currentCase.nursingNotes.length ? currentCase.nursingNotes.map(n => {
    const flags = abnormalVitals(n).map(f => `<span class="flag">⚠️ ${esc(f)}</span>`).join('');
    return `
      <div class="entry">
        <div class="entry-head">
          <strong>${esc(n.nurse_name)}</strong>
          <span class="muted small">${fmtDT(n.recorded_at)}</span>
        </div>
        <div style="margin: 6px 0;">${esc(n.note)}</div>
        ${flags ? `<div style="margin: 6px 0;">${flags}</div>` : ''}
        <div class="vitals">
          ${n.bp ? `<span>BP: ${esc(n.bp)}</span>` : ''}
          ${n.pulse ? `<span>&bull; Pulse: ${n.pulse} bpm</span>` : ''}
          ${n.temp_c ? `<span>&bull; Temp: ${n.temp_c}&deg;F</span>` : ''}
          ${n.spo2 ? `<span>&bull; SpO2: ${n.spo2}%</span>` : ''}
          ${n.resp ? `<span>&bull; Resp: ${n.resp} /min</span>` : ''}
        </div>
      </div>`;
  }).join('') : '<p class="muted">No nursing notes recorded yet.</p>');

  if (document.getElementById('noteSave')) {
    document.getElementById('noteSave').onclick = async () => {
      const noteEl = document.getElementById('noteText');
      const vBp = document.getElementById('vBp');
      const vPulse = document.getElementById('vPulse');
      const vTemp = document.getElementById('vTemp');
      const vSpo2 = document.getElementById('vSpo2');
      const vResp = document.getElementById('vResp');
      const err = document.getElementById('noteError');
      err.hidden = true;
      if (!noteEl.value.trim() && !vBp.value.trim() && !vPulse.value && !vTemp.value && !vSpo2.value && !vResp.value) {
        err.textContent = 'Please enter a nursing note or at least one vital sign.';
        err.hidden = false;
        return;
      }
      await api('/nursing-notes/', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          nurseName: staff.name,
          note: noteEl.value.trim(),
          bp: vBp.value.trim(),
          pulse: Number(vPulse.value) || 0,
          tempC: Number(vTemp.value) || 0,
          spo2: Number(vSpo2.value) || 0,
          resp: Number(vResp.value) || 0
        })
      });
      load();
    };
  }
}

// ---------- 5. Orders (Retool Screenshot 3) ----------
function renderOrders() {
  const box = document.getElementById('orders');
  const formsHtml = canOrderSupplies ? `
    <div class="orders-form-card">
      <p class="orders-form-title">Order medicine to pharmacy (demo)</p>
      <div class="row" style="gap:8px;">
        <select id="phMedSelect" class="custom-select" style="flex:1;">
          <option value="">Pick medicine...</option>
          ${master.medicines.map(m => `<option value="${m.id}">${esc(m.label)}</option>`).join('')}
        </select>
        <input id="phQty" type="number" min="1" value="1" placeholder="Qty" style="max-width:80px;" />
        <button id="phSave" class="btn btn-primary">Send to pharmacy</button>
      </div>
    </div>

    <div class="orders-form-card">
      <p class="orders-form-title">Order blood units for this patient (demo)</p>
      <div class="row" style="gap:8px;">
        <select id="blTypeSelect" class="custom-select" style="flex:1;">
          <option value="">Pick blood type...</option>
          ${master.bloodStock.map(b => `<option value="${b.blood_type}">${b.blood_type} &mdash; ${b.units_available} unit(s) available</option>`).join('')}
        </select>
        <input id="blUnits" type="number" min="1" value="1" placeholder="Units" style="max-width:80px;" />
        <button id="blSave" class="btn btn-primary">Place blood order</button>
      </div>
      <p id="blError" class="error" hidden></p>
    </div>` : '';

  const pharmacyList = `
    <div class="orders-col">
      <h3 class="orders-col-title">Pharmacy orders for this patient</h3>
      ${currentCase.pharmacyOrders.length ? currentCase.pharmacyOrders.map(o => `
        <div class="entry">
          <div class="entry-head">
            <div>
              <strong>${esc(o.medicine_name)}</strong>
              <span class="muted small">${esc(o.form)} ${esc(o.strength)} &times; ${o.quantity}</span>
              <div class="muted small">By ${esc(o.placed_by)} &bull; ${fmtDT(o.placed_at)}</div>
            </div>
            <span class="badge">${cap(o.status)}</span>
          </div>
        </div>`).join('') : '<p class="muted">None yet.</p>'}
    </div>`;

  const bloodList = `
    <div class="orders-col">
      <h3 class="orders-col-title">Blood orders for this patient</h3>
      ${currentCase.bloodOrders.length ? currentCase.bloodOrders.map(o => `
        <div class="entry">
          <div class="entry-head">
            <div>
              <strong>${esc(o.blood_type)}</strong> &bull; ${o.units} unit(s)
              <div class="muted small">By ${esc(o.placed_by)} &bull; ${fmtDT(o.placed_at)}</div>
            </div>
            <span class="badge">${cap(o.status)}</span>
          </div>
        </div>`).join('') : '<p class="muted">None yet.</p>'}
    </div>`;

  box.innerHTML = formsHtml + `<div class="orders-grid">${pharmacyList}${bloodList}</div>`;

  if (canOrderSupplies) {
    document.getElementById('phSave').onclick = async () => {
      const sel = document.getElementById('phMedSelect').value;
      const qty = Number(document.getElementById('phQty').value) || 1;
      if (!sel) return;
      await api('/pharmacy-orders/', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          medicineId: Number(sel),
          quantity: qty,
          placedBy: staff.name || staff.username
        })
      });
      load();
    };

    document.getElementById('blSave').onclick = async () => {
      const sel = document.getElementById('blTypeSelect').value;
      const units = Number(document.getElementById('blUnits').value) || 1;
      const err = document.getElementById('blError');
      err.hidden = true;
      if (!sel) {
        err.textContent = 'Please pick a blood type.';
        err.hidden = false;
        return;
      }
      const result = await api('/blood-orders/', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          bloodType: sel,
          units: units,
          placedBy: staff.name || staff.username
        })
      });
      if (result.ok) load();
      else {
        err.textContent = result.error || 'Could not place order.';
        err.hidden = false;
      }
    };
  }
}

// ---------- 6. Dialogs (Status & Discharge) ----------
function setupDialogs() {
  const p = currentCase.patient;
  const dischargeBtn = document.getElementById('dischargeBtn');
  const statusBtn = document.getElementById('statusBtn');
  const dischargeDialog = document.getElementById('dischargeDialog');
  const statusDialog = document.getElementById('statusDialog');
  const statusCancel = document.getElementById('statusCancel');
  const dischargeCancel = document.getElementById('dischargeCancel');

  if (dischargeCancel) dischargeCancel.onclick = () => { dischargeDialog.hidden = true; };
  if (statusCancel) statusCancel.onclick = () => { statusDialog.hidden = true; };
  if (dischargeDialog) dischargeDialog.onclick = (e) => { if (e.target === dischargeDialog) dischargeDialog.hidden = true; };
  if (statusDialog) statusDialog.onclick = (e) => { if (e.target === statusDialog) statusDialog.hidden = true; };

  if (canDischarge && p.status === 'admitted') {
    dischargeBtn.hidden = false;
    dischargeBtn.onclick = () => {
      document.getElementById('dischargeTitle').textContent = 'Discharge ' + p.name;
      const active = currentCase.prescriptions.filter(r => r.status === 'active');
      document.getElementById('dischargeMeds').innerHTML = active.length ? active.map(r =>
        `<li><strong>${esc(r.medicine_name)}</strong> ${esc(r.form)} ${esc(r.strength)} &mdash; ${esc(r.dosage)}, ${esc(r.frequency)}, ${r.duration_days} day(s)</li>`
      ).join('') : '<li class="muted">No active medicines.</li>';
      document.getElementById('dischargeSummary').value = '';
      dischargeDialog.hidden = false;
    };

    document.getElementById('dischargeConfirm').onclick = async () => {
      const err = document.getElementById('dischargeError');
      const sumEl = document.getElementById('dischargeSummary');
      err.hidden = true;
      if (!sumEl.value.trim()) {
        err.textContent = 'Write the discharge summary first.';
        err.hidden = false;
        return;
      }
      const result = await api('/discharge/', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          summary: sumEl.value.trim(),
          dischargedBy: staff.name
        })
      });
      if (result.ok) { dischargeDialog.hidden = true; load(); }
      else { err.textContent = 'Could not discharge.'; err.hidden = false; }
    };
  }

  if (canUpdateStatus && p.status === 'admitted') {
    statusBtn.hidden = false;
    const OPTS = [
      { id: 'critical', label: 'CRITICAL', cls: 'card-critical' },
      { id: 'serious',  label: 'SERIOUS',  cls: 'card-serious'  },
      { id: 'stable',   label: 'STABLE',   cls: 'card-stable'   },
    ];
    let choice = p.condition_flag;

    statusBtn.onclick = () => {
      choice = p.condition_flag;
      document.getElementById('statusOptions').innerHTML = OPTS.map(o => `
        <button class="status-opt btn ${choice === o.id ? o.cls : ''}" data-id="${o.id}"
          style="width:100%;${choice === o.id ? '' : 'opacity:.75'}">${o.label}</button>`).join('');
      document.getElementById('statusOptions').querySelectorAll('.status-opt').forEach(b => b.onclick = () => {
        choice = b.dataset.id;
        document.getElementById('statusOptions').querySelectorAll('.status-opt').forEach(x => x.classList.remove('card-critical','card-serious','card-stable'));
        b.classList.add(OPTS.find(o => o.id === choice).cls);
      });
      statusDialog.hidden = false;
    };

    document.getElementById('statusSave').onclick = async () => {
      const result = await api('/patient-condition/', {
        method: 'POST',
        body: JSON.stringify({
          patientId,
          conditionFlag: choice,
          updatedBy: staff.name,
          role: staff.role
        })
      });
      if (result.ok) { statusDialog.hidden = true; load(); }
      else {
        const err = document.getElementById('statusError');
        err.textContent = result.error || 'Could not update.';
        err.hidden = false;
      }
    };
  }
}

// ---------- 7. Case Summary Modal ----------
function setupCaseSummary() {
  const p = currentCase.patient;
  const btn = document.getElementById('summaryBtn');
  const dlg = document.getElementById('summaryDialog');
  const closeBtn = document.getElementById('summaryClose');
  const cancelBtn = document.getElementById('summaryCancel');

  if (closeBtn) closeBtn.onclick = () => { dlg.hidden = true; };
  if (cancelBtn) cancelBtn.onclick = () => { dlg.hidden = true; };
  if (dlg) {
    dlg.onclick = (e) => { if (e.target === dlg) dlg.hidden = true; };
  }

  if (btn) {
    btn.onclick = () => {
      const activeRx = currentCase.prescriptions.filter(r => r.status === 'active');
      const latestNotes = currentCase.nursingNotes.slice(0, 3);
      const sexFormatted = p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : 'Other';

      document.getElementById('summaryBody').innerHTML = `
        <div class="summary-section">
          <h4>Patient Demographics</h4>
          <p><strong>Name:</strong> ${esc(p.name)} &nbsp;|&nbsp; <strong>Age:</strong> ${p.age} yrs &nbsp;|&nbsp; <strong>Sex:</strong> ${sexFormatted}</p>
          <p><strong>Ward:</strong> ${esc(p.ward_name || p.ward_code || 'ICU')} &nbsp;|&nbsp; <strong>Bed:</strong> ${esc(p.bed_no)} &nbsp;|&nbsp; <strong>Status:</strong> ${cap(p.status)} (${p.condition_flag.toUpperCase()})</p>
          <p><strong>Admission Date:</strong> ${fmtDate(p.admission_date)}</p>
          <p><strong>Reason for Admission:</strong> ${esc(p.reason)}</p>
        </div>

        <div class="summary-section">
          <h4>Active Medications (${activeRx.length})</h4>
          ${activeRx.length ? `<ul>${activeRx.map(r => `<li><strong>${esc(r.medicine_name)}</strong> (${esc(r.form)} ${esc(r.strength)}) &mdash; ${esc(r.dosage)}, ${esc(r.frequency)}, ${r.duration_days} day(s) (by ${esc(r.prescribed_by)})</li>`).join('')}</ul>` : '<p class="muted">No active medications.</p>'}
        </div>

        <div class="summary-section">
          <h4>Doctor Visits &amp; Clinical Notes (${currentCase.visits.length})</h4>
          ${currentCase.visits.length ? currentCase.visits.map(v => `<p>&bull; <strong>${esc(v.doctor_name)}</strong> (${esc(v.specialty)}, ${fmtDT(v.visit_at)}): ${esc(v.notes)}</p>`).join('') : '<p class="muted">No visits recorded.</p>'}
        </div>

        <div class="summary-section">
          <h4>Laboratory Tests &amp; Results (${currentCase.testOrders.length})</h4>
          ${currentCase.testOrders.length ? currentCase.testOrders.map(t => `<p>&bull; <strong>${esc(t.test_name)}</strong>: ${t.result_value ? esc(t.result_value) + (t.result_notes ? ` (${esc(t.result_notes)})` : '') : '<span class="muted">Awaiting result</span>'}</p>`).join('') : '<p class="muted">No tests ordered.</p>'}
        </div>

        <div class="summary-section">
          <h4>Recent Vitals &amp; Nursing Observations</h4>
          ${latestNotes.length ? latestNotes.map(n => `<p>&bull; [${fmtDT(n.recorded_at)}] <strong>${esc(n.nurse_name)}:</strong> ${esc(n.note)} <span class="muted">(BP: ${n.bp || '-'}, Pulse: ${n.pulse || '-'}, Temp: ${n.temp_c || '-'}&deg;F, SpO2: ${n.spo2 || '-'}%)</span></p>`).join('') : '<p class="muted">No nursing notes.</p>'}
        </div>
      `;
      dlg.hidden = false;
    };
  }
}

load();
