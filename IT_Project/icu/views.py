import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.db import connection

def query(sql, params=None):
    """Run a SELECT and return a list of dicts (rows)."""
    with connection.cursor() as cur:
        cur.execute(sql, params or [])
        columns = [col[0] for col in cur.description]
        return [dict(zip(columns, row)) for row in cur.fetchall()]

def execute(sql, params=None):
    """Run an INSERT/UPDATE and return the new row id."""
    with connection.cursor() as cur:
        cur.execute(sql, params or [])
        return cur.lastrowid

def body(request):
    return json.loads(request.body or '{}')

# ---------- auth ----------
@csrf_exempt
def login_view(request):
    data = body(request)
    rows = query(
        "SELECT s.id, s.name, s.username, s.role, s.password, s.ward_id, w.name AS ward_name, "
        'w.code AS ward_code FROM staff s LEFT JOIN wards w ON w.id = s.ward_id WHERE s.username = %s',
        [data.get('username', '')],
    )
    if not rows:
        return JsonResponse({'ok': False, 'error': 'Unknown username'})
    if rows[0].pop('password') != data.get('password', ''):
        return JsonResponse({'ok': False, 'error': 'Wrong password for this demo account'})
    return JsonResponse({'ok': True, 'staff': rows[0]})

# ---------- master data ----------
def bootstrap(request):
    return JsonResponse({
        'wards': query('SELECT id, name, code FROM wards ORDER BY id'),
        'staff': query(
            'SELECT s.id, s.name, s.username, s.role, s.ward_id, w.name AS ward_name, '
            'w.code AS ward_code FROM staff s LEFT JOIN wards w ON w.id = s.ward_id ORDER BY s.id'),
        'doctors': query("SELECT id, name, specialty FROM doctors ORDER BY name"),
        'medicines': query(
            "SELECT id, name, form, strength, CONCAT(name, ' ', form, ' ', strength) AS label "
            'FROM medicines ORDER BY name'),
        'tests': query('SELECT id, name, category FROM tests ORDER BY category, name'),
        'bloodStock': query('SELECT id, blood_type, units_available FROM blood_bank_stock ORDER BY blood_type'),
    })

def ward_patients(request, ward_id):
    patients = query(
        'SELECT id, name, age, sex, ward_id, bed_no, admission_date, reason, status, condition_flag '
        "FROM patients WHERE ward_id = %s AND status = 'admitted' "
        "ORDER BY FIELD(condition_flag, 'critical','serious','stable'), bed_no",
        [ward_id],
    )
    pending = {r['patient_id']: r['n'] for r in query(
        "SELECT patient_id, COUNT(*) AS n FROM test_orders WHERE status = 'ordered' GROUP BY patient_id")}
    for p in patients:
        p['open_tests'] = pending.get(p['id'], 0)
    return JsonResponse({'patients': patients})

def patient_case(request, patient_id):
    return JsonResponse({
        'patient': (query(
            'SELECT p.*, w.name AS ward_name, w.code AS ward_code '
            'FROM patients p JOIN wards w ON w.id = p.ward_id WHERE p.id = %s', [patient_id]) or [None])[0],
        'visits': query(
            'SELECT v.id, v.visit_at, v.notes, v.recorded_by, d.name AS doctor_name, d.specialty '
            'FROM doctor_visits v JOIN doctors d ON d.id = v.doctor_id '
            'WHERE v.patient_id = %s ORDER BY v.visit_at DESC', [patient_id]),
        'prescriptions': query(
            'SELECT r.id, r.dosage, r.frequency, r.duration_days, r.prescribed_by, r.prescribed_at, '
            'r.status, m.name AS medicine_name, m.form, m.strength '
            'FROM prescriptions r JOIN medicines m ON m.id = r.medicine_id '
            'WHERE r.patient_id = %s ORDER BY r.prescribed_at DESC', [patient_id]),
        'testOrders': query(
            'SELECT o.id, o.ordered_by, o.ordered_at, o.status, t.name AS test_name, t.category, '
            'res.id AS result_id, res.result_value, res.notes AS result_notes, '
            'res.recorded_by AS result_by, res.recorded_at AS result_at '
            'FROM test_orders o JOIN tests t ON t.id = o.test_id '
            'LEFT JOIN test_results res ON res.order_id = o.id '
            'WHERE o.patient_id = %s ORDER BY o.ordered_at DESC', [patient_id]),
        'nursingNotes': query(
            'SELECT id, nurse_name, note, bp, pulse, temp_c, spo2, resp, recorded_at '
            'FROM nursing_notes WHERE patient_id = %s ORDER BY recorded_at DESC LIMIT 30', [patient_id]),
        'pharmacyOrders': query(
            'SELECT po.id, po.quantity, po.status, po.placed_by, po.placed_at, '
            'm.name AS medicine_name, m.form, m.strength '
            'FROM pharmacy_orders po JOIN medicines m ON m.id = po.medicine_id '
            'WHERE po.patient_id = %s ORDER BY po.placed_at DESC', [patient_id]),
        'bloodOrders': query(
            'SELECT id, blood_type, units, status, placed_by, placed_at FROM blood_orders '
            'WHERE patient_id = %s ORDER BY placed_at DESC', [patient_id]),
    })

# ---------- writes ----------
@csrf_exempt
def add_visit(request):
    d = body(request)
    execute('INSERT INTO doctor_visits (patient_id, doctor_id, notes, recorded_by) VALUES (%s,%s,%s,%s)',
            [d['patientId'], d['doctorId'], d['notes'], d['recordedBy']])
    return JsonResponse({'ok': True})

@csrf_exempt
def add_prescription(request):
    d = body(request)
    execute('INSERT INTO prescriptions (patient_id, medicine_id, dosage, frequency, duration_days, prescribed_by) '
            'VALUES (%s,%s,%s,%s,%s,%s)',
            [d['patientId'], d['medicineId'], d['dosage'], d['frequency'], d['durationDays'], d['prescribedBy']])
    return JsonResponse({'ok': True})

@csrf_exempt
def add_test_order(request):
    d = body(request)
    execute('INSERT INTO test_orders (patient_id, test_id, ordered_by) VALUES (%s,%s,%s)',
            [d['patientId'], d['testId'], d['orderedBy']])
    return JsonResponse({'ok': True})

@csrf_exempt
def add_test_result(request):
    d = body(request)
    execute('INSERT INTO test_results (order_id, result_value, notes, recorded_by) VALUES (%s,%s,%s,%s)',
            [d['orderId'], d['resultValue'], d.get('notes', ''), d['recordedBy']])
    with connection.cursor() as cur:
        cur.execute("UPDATE test_orders SET status = 'result_available' WHERE id = %s", [d['orderId']])
    return JsonResponse({'ok': True})

@csrf_exempt
def add_nursing_note(request):
    d = body(request)
    execute('INSERT INTO nursing_notes (patient_id, nurse_name, note, bp, pulse, temp_c, spo2, resp) '
            'VALUES (%s,%s,%s,%s,%s,%s,%s,%s)',
            [d['patientId'], d['nurseName'], d['note'], d.get('bp'), d.get('pulse'),
             d.get('tempC'), d.get('spo2'), d.get('resp')])
    return JsonResponse({'ok': True})

@csrf_exempt
def place_pharmacy_order(request):
    d = body(request)
    execute('INSERT INTO pharmacy_orders (patient_id, medicine_id, quantity, placed_by) VALUES (%s,%s,%s,%s)',
            [d['patientId'], d['medicineId'], d['quantity'], d['placedBy']])
    return JsonResponse({'ok': True})

@csrf_exempt
def place_blood_order(request):
    d = body(request)
    rows = query('SELECT id, units_available FROM blood_bank_stock WHERE blood_type = %s', [d['bloodType']])
    if not rows:
        return JsonResponse({'ok': False, 'error': 'Unknown blood type'})
    if rows[0]['units_available'] < d['units']:
        return JsonResponse({'ok': False, 'error': f"Only {rows[0]['units_available']} unit(s) available"})
    with connection.cursor() as cur:
        cur.execute('UPDATE blood_bank_stock SET units_available = units_available - %s WHERE id = %s',
                    [d['units'], rows[0]['id']])
        cur.execute('INSERT INTO blood_orders (patient_id, blood_type, units, placed_by) VALUES (%s,%s,%s,%s)',
                    [d['patientId'], d['bloodType'], d['units'], d['placedBy']])
    return JsonResponse({'ok': True})

def orders_queue(request):
    return JsonResponse({
        'pharmacy': query(
            "SELECT po.id, po.quantity, po.status, po.placed_by, po.placed_at, m.name AS medicine_name, "
            'm.form, m.strength, p.name AS patient_name, p.bed_no, w.code AS ward_code '
            'FROM pharmacy_orders po JOIN medicines m ON m.id = po.medicine_id '
            'JOIN patients p ON p.id = po.patient_id JOIN wards w ON w.id = p.ward_id '
            "ORDER BY (po.status = 'placed') DESC, po.placed_at DESC"),
        'blood': query(
            'SELECT bo.id, bo.blood_type, bo.units, bo.status, bo.placed_by, bo.placed_at, '
            'p.name AS patient_name, p.bed_no, w.code AS ward_code '
            'FROM blood_orders bo JOIN patients p ON p.id = bo.patient_id JOIN wards w ON w.id = p.ward_id '
            "ORDER BY (bo.status = 'placed') DESC, bo.placed_at DESC"),
    })

@csrf_exempt
def update_order_status(request, kind, order_id):
    d = body(request)
    table = {'pharmacy': 'pharmacy_orders', 'blood': 'blood_orders'}.get(kind)
    if not table:
        return JsonResponse({'ok': False, 'error': 'Invalid order kind'})
    with connection.cursor() as cur:
        cur.execute(f'UPDATE {table} SET status = %s WHERE id = %s', [d['status'], order_id])
    return JsonResponse({'ok': True})

@csrf_exempt
def update_blood_stock(request, stock_id):
    d = body(request)
    with connection.cursor() as cur:
        cur.execute('UPDATE blood_bank_stock SET units_available = %s WHERE id = %s',
                    [d['unitsAvailable'], stock_id])
    return JsonResponse({'ok': True})

@csrf_exempt
def admit_patient(request):
    d = body(request)
    exists = query("SELECT id FROM patients WHERE ward_id = %s AND bed_no = %s AND status = 'admitted'",
                   [d['wardId'], d['bedNo']])
    if exists:
        return JsonResponse({'ok': False, 'error': 'That bed is already occupied in this ward'})
    execute('INSERT INTO patients (name, age, sex, ward_id, bed_no, admission_date, reason) '
            'VALUES (%s,%s,%s,%s,%s,CURDATE(),%s)',
            [d['name'], d['age'], d['sex'], d['wardId'], d['bedNo'], d['reason']])
    return JsonResponse({'ok': True})

@csrf_exempt
def discharge_patient(request):
    d = body(request)
    meds = query(
        "SELECT m.name AS medicine_name, r.dosage, r.frequency, r.duration_days "
        'FROM prescriptions r JOIN medicines m ON m.id = r.medicine_id '
        "WHERE r.patient_id = %s AND r.status = 'active' ORDER BY r.prescribed_at DESC",
        [d['patientId']])
    lines = [f"{m['medicine_name']} — {m['dosage']}, {m['frequency']}, {m['duration_days']} day(s)" for m in meds]
    full_summary = d['summary'] + ('\n\nMedicines on discharge:\n- ' + '\n- '.join(lines) if lines else '')
    with connection.cursor() as cur:
        cur.execute('UPDATE patients SET status = %s, discharge_summary = %s, discharge_at = NOW() WHERE id = %s',
                    ['discharged', full_summary, d['patientId']])
    return JsonResponse({'ok': True, 'medicinesIncluded': len(lines)})

@csrf_exempt
def update_patient_condition(request):
    d = body(request)
    with connection.cursor() as cur:
        cur.execute('UPDATE patients SET condition_flag = %s WHERE id = %s',
                    [d['conditionFlag'], d['patientId']])
    return JsonResponse({'ok': True})