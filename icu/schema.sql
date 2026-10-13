CREATE DATABASE IF NOT EXISTS hospital_icu CHARACTER SET utf8mb4;
USE hospital_icu;

CREATE TABLE wards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,          -- demo only; use hashing in production
  role ENUM('doctor','nurse','admin') NOT NULL,
  ward_id INT NULL,
  FOREIGN KEY (ward_id) REFERENCES wards(id)
);

CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  sex ENUM('M','F','O') NOT NULL,
  ward_id INT NOT NULL,
  bed_no VARCHAR(20) NOT NULL,
  admission_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('admitted','discharged') NOT NULL DEFAULT 'admitted',
  condition_flag ENUM('critical','serious','stable') NOT NULL DEFAULT 'stable',
  discharge_summary TEXT NULL,
  discharge_at DATETIME NULL,
  FOREIGN KEY (ward_id) REFERENCES wards(id)
);

CREATE TABLE doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  specialty VARCHAR(100) NOT NULL
);

CREATE TABLE medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  form VARCHAR(30) NOT NULL,
  strength VARCHAR(50) NOT NULL
);

CREATE TABLE tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL
);

CREATE TABLE doctor_visits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  visit_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NOT NULL,
  recorded_by VARCHAR(50) NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE TABLE prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  medicine_id INT NOT NULL,
  dosage VARCHAR(50) NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  duration_days INT NOT NULL,
  prescribed_by VARCHAR(100) NOT NULL,
  prescribed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active','completed') NOT NULL DEFAULT 'active',
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (medicine_id) REFERENCES medicines(id)
);

CREATE TABLE test_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  test_id INT NOT NULL,
  ordered_by VARCHAR(100) NOT NULL,
  ordered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('ordered','result_available') NOT NULL DEFAULT 'ordered',
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (test_id) REFERENCES tests(id)
);

CREATE TABLE test_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  result_value TEXT NOT NULL,
  notes TEXT NULL,
  recorded_by VARCHAR(100) NOT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES test_orders(id)
);

CREATE TABLE nursing_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  nurse_name VARCHAR(100) NOT NULL,
  note TEXT NOT NULL,
  bp VARCHAR(20) NULL,
  pulse INT NULL,
  temp_c DECIMAL(4,1) NULL,
  spo2 INT NULL,
  resp INT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE pharmacy_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  medicine_id INT NOT NULL,
  quantity INT NOT NULL,
  status ENUM('placed','dispensed') NOT NULL DEFAULT 'placed',
  placed_by VARCHAR(50) NOT NULL,
  placed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (medicine_id) REFERENCES medicines(id)
);

CREATE TABLE blood_bank_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  blood_type VARCHAR(5) NOT NULL UNIQUE,
  units_available INT NOT NULL
);

CREATE TABLE blood_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  blood_type VARCHAR(5) NOT NULL,
  units INT NOT NULL,
  status ENUM('placed','fulfilled') NOT NULL DEFAULT 'placed',
  placed_by VARCHAR(50) NOT NULL,
  placed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- ============================================================
-- DUMMY DATA (all fictional)
-- ============================================================

INSERT INTO wards (id, name, code) VALUES
  (1, 'General Male Ward', 'WARD-A'),
  (2, 'General Female Ward', 'WARD-B'),
  (3, 'ICU / High Dependency', 'ICU');

INSERT INTO staff (id, name, username, password, role, ward_id) VALUES
  (1, 'Dr. A. Rao (Admin)', 'admin',   'admin123',  'admin',  NULL),
  (2, 'Dr. Meera Iyer',     'd.meera', 'doctor123', 'doctor', 1),
  (3, 'Dr. Sanjay Gupta',   'd.sanjay','doctor123', 'doctor', 2),
  (4, 'Dr. Priya Nair',     'd.priya', 'doctor123', 'doctor', 3),
  (5, 'Nurse Ramesh K',     'n.ramesh','nurse123',  'nurse',  1),
  (6, 'Nurse Sunita Devi',  'n.sunita','nurse123',  'nurse',  2),
  (7, 'Nurse Farah Khan',   'n.farah', 'nurse123',  'nurse',  3);

INSERT INTO doctors (id, name, specialty) VALUES
  (1,  'Dr. Meera Iyer',     'General Medicine'),
  (2,  'Dr. Sanjay Gupta',   'Cardiology'),
  (3,  'Dr. Priya Nair',     'Pulmonology'),
  (4,  'Dr. Vikram Shah',    'Orthopaedics'),
  (5,  'Dr. Leela Menon',    'Neurology'),
  (6,  'Dr. Arjun Pillai',   'Gastroenterology'),
  (7,  'Dr. Kavya Reddy',    'Endocrinology'),
  (8,  'Dr. Rohit Desai',    'Nephrology'),
  (9,  'Dr. Anjali Bose',    'Oncology'),
  (10, 'Dr. Sameer Joshi',   'Infectious Diseases'),
  (11, 'Dr. Nikhil Verma',   'Critical Care'),
  (12, 'Dr. Shalini Kapoor', 'Critical Care'),
  (13, 'Dr. Farhan Qureshi', 'Anaesthesiology'),
  (14, 'Dr. Divya Menon',    'Anaesthesiology'),
  (15, 'Dr. Rajeev Kaul',    'Cardiology'),
  (16, 'Dr. Sneha Rathore',  'Neurology'),
  (17, 'Dr. Imran Sheikh',   'Nephrology'),
  (18, 'Dr. Lakshmi Prasad', 'Endocrinology'),
  (19, 'Dr. Tarun Bhatia',   'Pulmonology'),
  (20, 'Dr. Nandini Rao',    'Gastroenterology'),
  (21, 'Dr. Aditya Kulkarni','Orthopaedics'),
  (22, 'Dr. Ritu Saxena',    'Oncology'),
  (23, 'Dr. Vivek Chandra',  'Infectious Diseases'),
  (24, 'Dr. Meghna Das',     'General Medicine'),
  (25, 'Dr. Akash Malhotra', 'Emergency Medicine'),
  (26, 'Dr. Preeti Shetty',  'Haematology'),
  (27, 'Dr. Saurabh Pandey', 'Urology'),
  (28, 'Dr. Meera Krishnan', 'Rheumatology'),
  (29, 'Dr. Harpreet Singh', 'Plastic Surgery'),
  (30, 'Dr. Ayesha Siddiqui','Paediatrics');

INSERT INTO medicines (id, name, form, strength) VALUES
  (1,  'Paracetamol',              'Tablet',    '500 mg'),
  (2,  'Azithromycin',             'Tablet',    '250 mg'),
  (3,  'Amoxicillin-Clavulanate',  'Tablet',    '625 mg'),
  (4,  'Ceftriaxone',              'Injection', '1 g'),
  (5,  'Pantoprazole',             'Tablet',    '40 mg'),
  (6,  'Metformin',                'Tablet',    '500 mg'),
  (7,  'Amlodipine',               'Tablet',    '5 mg'),
  (8,  'Atorvastatin',             'Tablet',    '10 mg'),
  (9,  'Salbutamol',               'Inhaler',   '100 mcg'),
  (10, 'Furosemide',               'Injection', '20 mg'),
  (11, 'Ondansetron',              'Injection', '4 mg'),
  (12, 'Tramadol',                 'Injection', '50 mg'),
  (13, 'Insulin Glargine',         'Injection', '100 IU/mL'),
  (14, 'Heparin',                  'Injection', '5000 IU'),
  (15, 'ORS Sachet',               'Powder',    '20.5 g'),
  (16, 'Cetirizine',               'Tablet',    '10 mg');

INSERT INTO tests (id, name, category) VALUES
  (1,  'Complete Blood Count (CBC)',            'Blood'),
  (2,  'Blood Sugar (Fasting/PP)',              'Blood'),
  (3,  'Liver Function Test (LFT)',             'Blood'),
  (4,  'Renal Function Test (RFT)',             'Blood'),
  (5,  'Serum Electrolytes',                    'Blood'),
  (6,  'Troponin-I',                            'Blood'),
  (7,  'D-Dimer',                               'Blood'),
  (8,  'Urine Routine',                         'Urine'),
  (9,  'Chest X-Ray (PA)',                      'Imaging'),
  (10, 'ECG (12-lead)',                         'Imaging'),
  (11, 'CT Scan - Chest',                       'Imaging'),
  (12, 'MRI - Brain',                           'Imaging'),
  (13, 'Ultrasound - Abdomen',                  'Imaging'),
  (14, 'Echocardiogram',                        'Cardiac'),
  (15, 'Sputum Culture',                        'Microbiology'),
  (16, 'Blood Culture',                         'Microbiology'),
  (17, 'HbA1c',                                 'Blood'),
  (18, 'Thyroid Profile (T3/T4/TSH)',           'Blood'),
  (19, 'Serum Creatinine',                      'Blood'),
  (20, 'Serum Lactate',                         'Blood'),
  (21, 'Prothrombin Time / INR',                'Blood'),
  (22, 'APTT',                                  'Blood'),
  (23, 'Arterial Blood Gas (ABG)',              'Blood'),
  (24, 'C-Reactive Protein (CRP)',              'Blood'),
  (25, 'Procalcitonin',                         'Blood'),
  (26, 'Serum Bilirubin (Total/Direct)',        'Blood'),
  (27, 'Amylase / Lipase',                      'Blood'),
  (28, 'Vitamin B12',                           'Blood'),
  (29, 'Platelet Count (Serial)',               'Blood'),
  (30, 'Malaria Parasite (Smear)',              'Blood'),
  (31, 'Dengue NS1 / IgM',                      'Blood'),
  (32, 'Widal Test',                            'Blood'),
  (33, 'Urea / BUN',                            'Blood'),
  (34, 'Magnesium Serum',                       'Blood'),
  (35, 'Phosphorus Serum',                      'Blood'),
  (36, 'Urine Culture',                         'Urine'),
  (37, 'Urine Microalbumin',                    'Urine'),
  (38, 'Stool Routine',                         'Stool'),
  (39, 'Stool Occult Blood',                    'Stool'),
  (40, 'X-Ray Abdomen (Erect)',                 'Imaging'),
  (41, 'X-Ray Spine (AP/Lateral)',              'Imaging'),
  (42, 'CT Scan - Head',                        'Imaging'),
  (43, 'CT Scan - Abdomen with Contrast',       'Imaging'),
  (44, 'MRI - Spine',                           'Imaging'),
  (45, 'USG - Doppler Lower Limb',              'Imaging'),
  (46, '2D Echocardiography',                   'Cardiac'),
  (47, 'Treadmill Test (TMT)',                  'Cardiac'),
  (48, 'Holter Monitoring (24h)',               'Cardiac'),
  (49, 'Spirometry (PFT)',                      'Pulmonary'),
  (50, 'Sleep Study (Polysomnography)',         'Pulmonary'),
  (51, 'Bronchoscopy with BAL',                 'Pulmonary'),
  (52, 'Endoscopy - Upper GI',                  'Procedure'),
  (53, 'Colonoscopy',                           'Procedure'),
  (54, 'Central Venous Pressure Monitoring',    'Procedure'),
  (55, 'Tracheal Aspirate Culture',             'Microbiology'),
  (56, 'Urine Pus Culture (Catheter Tip)',      'Microbiology'),
  (57, 'CSF Analysis',                          'Microbiology'),
  (58, 'Wound Swab Culture',                    'Microbiology'),
  (59, 'Covid-19 RT-PCR',                       'Microbiology'),
  (60, 'HIV 1/2 Rapid',                         'Serology'),
  (61, 'HBsAg',                                 'Serology'),
  (62, 'Anti-HCV',                              'Serology');

INSERT INTO blood_bank_stock (id, blood_type, units_available) VALUES
  (1, 'A+', 12), (2, 'A-', 4), (3, 'B+', 9), (4, 'B-', 2),
  (5, 'AB+', 5), (6, 'AB-', 1), (7, 'O+', 15), (8, 'O-', 3);

-- 14 ICU patients (2 critical / red, serious, stable)
INSERT INTO patients (id, name, age, sex, ward_id, bed_no, admission_date, reason, status, condition_flag) VALUES
  (1,  'Ibrahim Khan',    68, 'M', 3, 'ICU-01', CURDATE() - INTERVAL 2 DAY, 'Septic shock, on vasopressors',      'admitted', 'critical'),
  (2,  'Tara Joshi',      59, 'F', 3, 'ICU-02', CURDATE() - INTERVAL 3 DAY, 'Stroke - left MCA territory',        'admitted', 'serious'),
  (3,  'Vijay Anand',     44, 'M', 3, 'ICU-03', CURDATE() - INTERVAL 1 DAY, 'Status asthmaticus, ventilated',     'admitted', 'serious'),
  (4,  'Nirmala Devi',    74, 'F', 3, 'ICU-04', CURDATE() - INTERVAL 4 DAY, 'Cardiogenic shock, post-MI',         'admitted', 'critical'),
  (5,  'Harish Chandra',  77, 'M', 3, 'ICU-05', CURDATE() - INTERVAL 1 DAY, 'Aspiration pneumonia, sepsis',       'admitted', 'serious'),
  (6,  'Zainab Ali',      31, 'F', 3, 'ICU-06', CURDATE() - INTERVAL 1 DAY, 'Post-partum haemorrhage, unstable',  'admitted', 'serious'),
  (7,  'Mohan Lal',       65, 'M', 3, 'ICU-07', CURDATE() - INTERVAL 2 DAY, 'COPD exacerbation with CO2 retention','admitted', 'serious'),
  (8,  'Sarita Bansal',   52, 'F', 3, 'ICU-08', CURDATE() - INTERVAL 2 DAY, 'Diabetic ketoacidosis, resolving',   'admitted', 'serious'),
  (9,  'Peter D Souza',   60, 'M', 3, 'ICU-09', CURDATE() - INTERVAL 3 DAY, 'Guillain-Barre syndrome, monitoring','admitted', 'serious'),
  (10, 'Kamala Pujari',   69, 'F', 3, 'ICU-10', CURDATE() - INTERVAL 3 DAY, 'Hyponatremia, corrected; observation','admitted', 'stable'),
  (11, 'Rakesh Tiwari',   47, 'M', 3, 'ICU-11', CURDATE() - INTERVAL 2 DAY, 'Snake bite, anti-venom administered','admitted', 'serious'),
  (12, 'Deepa Nair',      41, 'F', 3, 'ICU-12', CURDATE() - INTERVAL 1 DAY, 'Post-thyroidectomy, calcium monitoring','admitted', 'stable'),
  (13, 'Suresh Yadav',    58, 'M', 3, 'ICU-13', CURDATE() - INTERVAL 4 DAY, 'GI bleed, stabilised post-endoscopy','admitted', 'stable'),
  (14, 'Anwar Sayed',     72, 'M', 3, 'ICU-14', CURDATE() - INTERVAL 1 DAY, 'Bradycardia, pacemaker awaiting',    'admitted', 'serious');

-- Sample clinical activity for a few patients
INSERT INTO doctor_visits (patient_id, doctor_id, visit_at, notes, recorded_by) VALUES
  (1, 11, NOW() - INTERVAL 6 HOUR, 'Critical care review done. Titrating inotropes, repeat ABG in 6h.', 'n.farah'),
  (2,  5, NOW() - INTERVAL 8 HOUR, 'Neuro review. GCS stable at 14, repeat CT if deterioration.',       'n.farah'),
  (3,  3, NOW() - INTERVAL 4 HOUR, 'Ventilator settings reduced. Trial of extubation tomorrow.',        'n.farah'),
  (4,  2, NOW() - INTERVAL 5 HOUR, 'Echo reviewed. Continue inotropes, strict input-output chart.',     'n.farah');

INSERT INTO prescriptions (patient_id, medicine_id, dosage, frequency, duration_days, prescribed_by) VALUES
  (1, 4, '1 g IV', 'BD',  5, 'Dr. Priya Nair'),
  (1, 10, '20 mg IV', 'BD', 3, 'Dr. Priya Nair'),
  (2, 1, '1 tab', 'TDS', 3, 'Dr. Priya Nair'),
  (3, 9, '2 puffs', 'QID', 5, 'Dr. Priya Nair'),
  (4, 12, '50 mg IV', 'SOS', 2, 'Dr. Priya Nair');

INSERT INTO test_orders (patient_id, test_id, ordered_by, status) VALUES
  (1, 23, 'Dr. Priya Nair', 'ordered'),
  (1, 16, 'Dr. Priya Nair', 'ordered'),
  (2, 12, 'Dr. Priya Nair', 'result_available'),
  (4, 14, 'Dr. Priya Nair', 'ordered');

INSERT INTO test_results (order_id, result_value, notes, recorded_by) VALUES
  (3, 'Acute infarct left MCA territory. No haemorrhage.', 'Consistent with clinical picture', 'Radiology');

INSERT INTO nursing_notes (patient_id, nurse_name, note, bp, pulse, temp_c, spo2, resp) VALUES
  (1, 'Nurse Farah Khan', 'On close monitoring. Urine output 40 mL/h. Sedation adequate.', '98/62', 108, 100.8, 92, 24),
  (2, 'Nurse Farah Khan', 'GCS 14. Limb power improving on left side.',                     '138/84', 88, 98.6, 96, 18),
  (3, 'Nurse Farah Khan', 'Ventilated, sedation maintained. Suctioning q2h.',               '112/70', 96, 99.0, 94, 20);

INSERT INTO pharmacy_orders (patient_id, medicine_id, quantity, status, placed_by) VALUES
  (1, 4, 4, 'placed', 'n.farah'),
  (3, 9, 2, 'dispensed', 'n.farah');
