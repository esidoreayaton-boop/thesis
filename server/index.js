import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection, getPool, getStatus } from './config/db.js';
import { sendLiveSms, formatPhoneNumber } from './services/smsService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-Memory Fallback Store (active if MySQL is unavailable)
let mockData = {
  users: [
    { id: 1, name: 'Super Admin Rodrigo Lim', email: 'superadmin@barangay.gov', role: 'superadmin', status: 'Active', last_login: '2026-08-20 08:00 AM' },
    { id: 2, name: 'Barangay Captain Juan Dela Cruz', email: 'admin@barangay.gov', role: 'admin', status: 'Active', last_login: '2026-08-20 09:00 AM' },
    { id: 3, name: 'Barangay Clerk Ana Reyes', email: 'staff@barangay.gov', role: 'staff', status: 'Active', last_login: '2026-08-20 08:45 AM' },
    { id: 4, name: 'Nurse Maria Santos', email: 'bhw@barangay.gov', role: 'bhw', status: 'Active', last_login: '2026-08-20 08:30 AM' },
    { id: 5, name: 'Juan Resident Dela Cruz', email: 'resident@gmail.com', role: 'resident', status: 'Active', verification_status: 'Verified', last_login: '2026-08-19 02:30 PM' },
    { id: 6, name: 'Josefina Villanueva', email: 'josefina@gmail.com', role: 'resident', status: 'Active', verification_status: 'Pending_Review', last_login: '2026-08-18 10:00 AM' }
  ],
  residents: [
    { id: 1, first_name: 'Juan', middle_name: 'Perez', last_name: 'Dela Cruz', date_of_birth: '1988-04-12', gender: 'Male', civil_status: 'Married', address: '123 Sampaguita St, Zone 1', household_id: 'HH-001', phone: '09171234567', email: 'juan.delacruz@gmail.com' },
    { id: 2, first_name: 'Maria', middle_name: 'Clara', last_name: 'Santos', date_of_birth: '1992-08-25', gender: 'Female', civil_status: 'Single', address: '456 Narra Ave, Zone 2', household_id: 'HH-002', phone: '09182345678', email: 'maria.santos@gmail.com' },
    { id: 3, first_name: 'Pedro', middle_name: 'Alcantara', last_name: 'Garcia', date_of_birth: '1985-11-03', gender: 'Male', civil_status: 'Married', address: '789 Mabini St, Zone 1', household_id: 'HH-003', phone: '09193456789', email: 'pedro.garcia@gmail.com' },
    { id: 4, first_name: 'Ana', middle_name: 'Bautista', last_name: 'Reyes', date_of_birth: '1995-02-14', gender: 'Female', civil_status: 'Single', address: '101 Rizal St, Zone 3', household_id: 'HH-004', phone: '09204567890', email: 'ana.reyes@gmail.com' },
    { id: 5, first_name: 'Teresa', middle_name: 'Luna', last_name: 'Ramos', date_of_birth: '1994-06-18', gender: 'Female', civil_status: 'Married', address: '202 Acacia St, Zone 2', household_id: 'HH-005', phone: '09215678901', email: 'teresa.ramos@gmail.com' }
  ],
  documents: [
    { id: 1, request_code: 'DOC-001', resident_id: 1, resident_name: 'Juan Dela Cruz', document_type: 'Barangay Clearance', purpose: 'Employment Requirements', status: 'Pending', requested_at: '2026-05-06 09:30 AM', processed_at: null, processed_by: '' },
    { id: 2, request_code: 'DOC-002', resident_id: 2, resident_name: 'Maria Santos', document_type: 'Certificate of Residency', purpose: 'Bank Account Opening', status: 'Processing', requested_at: '2026-05-06 10:15 AM', processed_at: null, processed_by: '' },
    { id: 3, request_code: 'DOC-003', resident_id: 3, resident_name: 'Pedro Garcia', document_type: 'Business Permit', purpose: 'Sari-Sari Store Operation', status: 'Pending', requested_at: '2026-05-05 04:20 PM', processed_at: null, processed_by: '' },
    { id: 4, request_code: 'DOC-004', resident_id: 4, resident_name: 'Ana Reyes', document_type: 'Barangay ID', purpose: 'Personal Identification', status: 'Completed', requested_at: '2026-05-05 02:30 PM', processed_at: '2026-05-05 04:30 PM', processed_by: 'Admin Juan' }
  ],
  maternal: [
    { id: 1, resident_id: 5, mother_name: 'Teresa Ramos', age: 29, pregnancy_status: 'Prenatal - 2nd Trimester', expected_due_date: '2026-09-15', last_visit: '2026-05-01', next_visit: '2026-05-15', risk_level: 'Low', notes: 'Normal blood pressure. Prescribed prenatal vitamins.' },
    { id: 2, resident_id: 2, mother_name: 'Rosa Mendez', age: 31, pregnancy_status: 'Prenatal - 3rd Trimester', expected_due_date: '2026-06-10', last_visit: '2026-04-28', next_visit: '2026-05-12', risk_level: 'Moderate', notes: 'Monitor blood sugar levels twice a week.' },
    { id: 3, resident_id: 4, mother_name: 'Lucia Torres', age: 26, pregnancy_status: 'Postnatal - 2 weeks', expected_due_date: null, last_visit: '2026-05-03', next_visit: '2026-05-17', risk_level: 'Low', notes: 'Healthy newborn recovery. Exclusive breastfeeding.' }
  ],
  immunizations: [
    { id: 1, child_name: 'Baby Maria Santos', parent_phone: '09182345678', vaccine_name: 'BCG', dose_number: 1, status: 'Completed', date_administered: '2026-05-05', due_date: '2026-05-05', days_overdue: 0, administered_by: 'BHW Maria' },
    { id: 2, child_name: 'Baby Juan Dela Cruz', parent_phone: '09171234567', vaccine_name: 'Hepatitis B', dose_number: 1, status: 'Completed', date_administered: '2026-05-04', due_date: '2026-05-04', days_overdue: 0, administered_by: 'BHW Maria' },
    { id: 3, child_name: 'Baby Ana Reyes', parent_phone: '09204567890', vaccine_name: 'DPT', dose_number: 2, status: 'Completed', date_administered: '2026-05-03', due_date: '2026-05-03', days_overdue: 0, administered_by: 'BHW Maria' },
    { id: 4, child_name: 'Baby Sofia Martinez', parent_phone: '09226789012', vaccine_name: 'MMR', dose_number: 1, status: 'Overdue', date_administered: null, due_date: '2026-04-20', days_overdue: 16, administered_by: '' },
    { id: 5, child_name: 'Baby Carlos Lopez', parent_phone: '09237890123', vaccine_name: 'DPT Booster', dose_number: 3, status: 'Overdue', date_administered: null, due_date: '2026-04-25', days_overdue: 11, administered_by: '' },
    { id: 6, child_name: 'Baby Elena Cruz', parent_phone: '09248901234', vaccine_name: 'Hepatitis B', dose_number: 2, status: 'Overdue', date_administered: null, due_date: '2026-04-28', days_overdue: 8, administered_by: '' }
  ],
  notifications: [
    { id: 1, recipient_name: 'Sofia Martinez', recipient_phone: '09226789012', type: 'Immunization Reminder', message: 'Reminder: Baby Sofia is scheduled for MMR vaccine at Barangay Health Center.', status: 'Sent', sent_at: '2026-05-06 08:15 AM' },
    { id: 2, recipient_name: 'Juan Dela Cruz', recipient_phone: '09171234567', type: 'Document Ready', message: 'Your Barangay Clearance request DOC-001 is now being processed.', status: 'Sent', sent_at: '2026-05-06 09:35 AM' }
  ],
  logs: [
    { id: 2, user_name: 'BHW Maria', user_role: 'BHW', action: 'Administered BCG vaccine to Baby Maria Santos', timestamp: '2026-05-05 10:00 AM' }
  ],
  messages: [
    { id: 1, sender_name: 'BHW Maria Santos', sender_role: 'bhw', recipient_role: 'admin', message: 'Good morning Captain/Admin Juan! We scheduled an immunization drive for Zone 2 this Friday. Please prepare clearance announcements.', timestamp: '2026-05-06 08:30 AM' },
    { id: 2, sender_name: 'Admin Juan Dela Cruz', sender_role: 'admin', recipient_role: 'bhw', message: 'Noted BHW Maria! We will post the announcement on the resident portal and issue SMS alerts today.', timestamp: '2026-05-06 09:15 AM' }
  ],
  pendingRegistrations: [
    { id: 101, name: 'Josefina Villanueva', email: 'josefina@gmail.com', phone: '09311234567', address: 'Purok 1, Barangay Pianing, Butuan City', submitted_id: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', submitted_at: '2026-05-06 10:45 AM', verification_status: 'Pending_Review' }
  ],
  faq: [
    { topic: 'Clearance', keywords: ['clearance', 'requirement', 'document', 'how to request'], response: 'To request a Barangay Clearance, you need a valid Government ID, Cedula, and proof of residency in Zone 1-4. Note: Unverified resident accounts must be verified by Barangay Admin first.' },
    { topic: 'Hours', keywords: ['hours', 'open', 'schedule', 'time', 'health center', 'clinic'], response: 'The Barangay Health Center is open Monday to Friday, from 8:00 AM to 5:00 PM. Infant immunizations take place every Wednesday & Friday morning.' },
    { topic: 'Vaccine', keywords: ['vaccine', 'immunization', 'baby', 'infant', 'bcg', 'polio', 'mmr'], response: 'Free infant vaccines (BCG, Hepatitis B, DPT, Polio, MMR) are available. Please bring your Mother-Baby Handbook when visiting BHW clinic.' },
    { topic: 'Business Permit', keywords: ['business', 'permit', 'store', 'sari-sari'], response: 'Barangay Business Permit requirements: DTI Registration, Lease/Property title, and Owner Valid ID. Processing takes 1-2 business days.' }
  ]
};

// -------------------------------------------------------------
// Database Health & Connectivity Endpoint
// -------------------------------------------------------------
app.get('/api/db-status', async (req, res) => {
  const connResult = await testConnection();
  res.json({
    ...connResult,
    mode: connResult.connected ? 'MySQL Database Connected' : 'In-Memory Engine (Fallback Mode)',
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// Authentication
// -------------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = (req.body?.password || '').trim();

  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });
  if (!password) return res.status(400).json({ success: false, message: 'Password is required.' });

  // Email alias resolution (clean format vs legacy format)
  const emailAliases = {
    'admin@barangay.gov': ['admin@barangay.gov', 'juan.admin@barangay.gov'],
    'staff@barangay.gov': ['staff@barangay.gov', 'ana.staff@barangay.gov', 'pedro.staff@barangay.gov'],
    'bhw@barangay.gov': ['bhw@barangay.gov', 'maria.bhw@barangay.gov', 'ligaya.bhw@barangay.gov'],
    'resident@gmail.com': ['resident@gmail.com', 'juan.resident@gmail.com'],
    'superadmin@barangay.gov': ['superadmin@barangay.gov'],
    'juan.admin@barangay.gov': ['admin@barangay.gov', 'juan.admin@barangay.gov'],
    'ana.staff@barangay.gov': ['staff@barangay.gov', 'ana.staff@barangay.gov'],
    'maria.bhw@barangay.gov': ['bhw@barangay.gov', 'maria.bhw@barangay.gov'],
    'juan.resident@gmail.com': ['resident@gmail.com', 'juan.resident@gmail.com'],
  };
  const searchEmails = emailAliases[email] || [email];

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) IN (?)', [searchEmails]);
      if (rows.length > 0) {
        const user = rows[0];
        if (user.password_hash !== password) {
          return res.status(401).json({ success: false, message: 'Invalid password. Please check your credentials.' });
        }
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
        return res.json({ success: true, user, message: 'Authentication successful' });
      } else {
        return res.status(401).json({ success: false, message: 'No account found with that email address.' });
      }
    } catch (err) {
      console.warn('MySQL auth query error:', err.message);
    }
  }

  // Fallback in-memory check
  const user = mockData.users.find(u => searchEmails.includes(u.email.toLowerCase()));
  if (user) {
    if ((user.password_hash || '123') !== password) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please check your credentials.' });
    }
    user.last_login = new Date().toLocaleString();
    return res.json({ success: true, user, message: 'Login successful' });
  }

  return res.status(401).json({ success: false, message: 'No account found with that email address.' });
});

// Resident Account Registration
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, address, phone, submitted_id } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required.' });
  }

  const parts = name.trim().split(' ');
  const firstName = parts[0] || 'Resident';
  const lastName = parts.slice(1).join(' ') || 'Resident';
  const rawPassword = password || '123';
  const userRole = role || 'resident';

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      // 1. Insert into users table
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role, status, verification_status, last_login) VALUES (?, ?, ?, ?, 'Active', 'Pending_Review', NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name), verification_status = 'Pending_Review'",
        [name, email.toLowerCase(), rawPassword, userRole]
      );

      // 2. Insert into residents table
      const [resResult] = await pool.query(
        "INSERT INTO residents (first_name, last_name, address, phone, email, household_id, verification_status, submitted_id, submitted_at) VALUES (?, ?, ?, ?, ?, 'HH-NEW', 'Pending_Review', ?, NOW())",
        [firstName, lastName, address || 'Zone 1, Barangay Main', phone || '', email.toLowerCase(), submitted_id || null]
      );

      return res.status(201).json({
        success: true,
        user: { id: resResult.insertId, name, email, role: userRole, verification_status: 'Pending_Review', submitted_id },
        message: 'Account created! Your submitted ID is under review by the Barangay Admin.'
      });
    } catch (err) {
      console.warn('MySQL register error:', err.message);
    }
  }

  // Fallback: store in mockData
  const newPending = {
    id: Date.now(),
    name,
    first_name: firstName,
    last_name: lastName,
    email: email.toLowerCase(),
    phone: phone || '',
    address: address || 'Zone 1, Barangay Main',
    household_id: 'HH-NEW',
    submitted_id: submitted_id || null,
    submitted_at: new Date().toLocaleString(),
    verification_status: 'Pending_Review'
  };
  mockData.pendingRegistrations.unshift(newPending);
  mockData.users.push({
    id: newPending.id,
    name,
    email: email.toLowerCase(),
    password_hash: rawPassword,
    role: userRole,
    status: 'Active',
    verification_status: 'Pending_Review',
    last_login: new Date().toLocaleString()
  });
  mockData.residents.unshift({
    id: newPending.id,
    first_name: firstName,
    last_name: lastName,
    date_of_birth: '2000-01-01',
    gender: 'Male',
    address: address || 'Zone 1, Barangay Main',
    household_id: 'HH-NEW',
    phone: phone || '',
    email: email.toLowerCase(),
    verification_status: 'Pending_Review',
    submitted_id: submitted_id || null
  });

  res.status(201).json({
    success: true,
    user: { id: newPending.id, name, email, role: userRole, verification_status: 'Pending_Review', submitted_id },
    message: 'Account created! Your submitted ID is under review by the Barangay Admin.'
  });
});

// GET pending resident registrations (for Admin approval)
app.get('/api/residents/pending', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query(
        "SELECT id, CONCAT(first_name, ' ', last_name) AS name, first_name, last_name, email, phone, address, household_id, submitted_id, submitted_at, verification_status FROM residents WHERE verification_status = 'Pending_Review' ORDER BY id DESC"
      );
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL pending residents error:', err.message);
    }
  }
  const pending = mockData.pendingRegistrations.filter(r => r.verification_status === 'Pending_Review');
  res.json(pending);
});

// Approve resident registration
app.put('/api/residents/:id/approve', async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      // Get resident details
      const [rows] = await pool.query("SELECT first_name, last_name, email, phone FROM residents WHERE id = ?", [id]);
      const resData = rows[0];
      const email = resData?.email;
      const residentName = resData ? `${resData.first_name} ${resData.last_name}` : 'Resident';
      const phone = resData?.phone || '09171234567';

      await pool.query("UPDATE residents SET verification_status = 'Verified' WHERE id = ?", [id]);
      if (email) {
        await pool.query("UPDATE users SET verification_status = 'Verified' WHERE LOWER(email) = LOWER(?)", [email]);
      }

      // Auto-dispatch SMS notification via iProg Gateway
      try {
        const smsMsg = `Welcome ${residentName}! Your Barangay resident account application has been VERIFIED. You can now request clearances, business permits, and health services online.`;
        await pool.query(
          "INSERT INTO sms_notifications (recipient_name, recipient_phone, type, message, status) VALUES (?, ?, 'Account Verified', ?, 'Sent')",
          [residentName, phone, smsMsg]
        );
        sendLiveSms(phone, smsMsg).catch(e => console.warn('iProg SMS error:', e.message));
      } catch (smsErr) {
        console.warn('Auto SMS dispatch warning:', smsErr.message);
      }

      return res.json({ success: true, message: 'Resident account approved and verified successfully.' });
    } catch (err) {
      console.warn('MySQL approve error:', err.message);
    }
  }
  // Fallback: update in mockData
  const idx = mockData.pendingRegistrations.findIndex(r => String(r.id) === String(id));
  if (idx !== -1) {
    mockData.pendingRegistrations[idx].verification_status = 'Verified';
    const email = mockData.pendingRegistrations[idx].email;
    const u = mockData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (u) u.verification_status = 'Verified';
  }
  const rIdx = mockData.residents.findIndex(r => String(r.id) === String(id));
  if (rIdx !== -1) {
    mockData.residents[rIdx].verification_status = 'Verified';
  }
  res.json({ success: true, message: 'Resident account approved and verified successfully.' });
});

// Reject resident registration
app.put('/api/residents/:id/reject', async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query("SELECT email FROM residents WHERE id = ?", [id]);
      const email = rows[0]?.email;
      await pool.query("UPDATE residents SET verification_status = 'Rejected' WHERE id = ?", [id]);
      if (email) {
        await pool.query("UPDATE users SET verification_status = 'Rejected' WHERE LOWER(email) = LOWER(?)", [email]);
      }
      return res.json({ success: true, message: 'Resident registration rejected.' });
    } catch (err) {
      console.warn('MySQL reject error:', err.message);
    }
  }
  const idx = mockData.pendingRegistrations.findIndex(r => String(r.id) === String(id));
  if (idx !== -1) {
    mockData.pendingRegistrations[idx].verification_status = 'Rejected';
    const email = mockData.pendingRegistrations[idx].email;
    const u = mockData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (u) u.verification_status = 'Rejected';
  }
  const rIdx = mockData.residents.findIndex(r => String(r.id) === String(id));
  if (rIdx !== -1) {
    mockData.residents[rIdx].verification_status = 'Rejected';
  }
  res.json({ success: true, message: 'Resident registration rejected.' });
});

// PUT /api/users/profile - Resident Profile Settings (update password and phone number only)
app.put('/api/users/profile', async (req, res) => {
  const { id, email, password, phone } = req.body;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      if (password) {
        await pool.query("UPDATE users SET password_hash = ? WHERE id = ? OR LOWER(email) = LOWER(?)", [password, id || 0, (email || '').toLowerCase()]);
      }
      if (phone) {
        await pool.query("UPDATE residents SET phone = ? WHERE id = ? OR LOWER(email) = LOWER(?)", [phone, id || 0, (email || '').toLowerCase()]);
      }
      return res.json({ success: true, message: 'Profile settings updated successfully.' });
    } catch (err) {
      console.warn('MySQL update profile error:', err.message);
    }
  }

  // Mock data fallback
  const user = mockData.users.find(u => (id && u.id === id) || (email && u.email.toLowerCase() === email.toLowerCase()));
  if (user && password) {
    user.password_hash = password;
  }
  const resident = mockData.residents.find(r => (id && r.id === id) || (email && r.email.toLowerCase() === email.toLowerCase()));
  if (resident && phone) {
    resident.phone = phone;
  }
  res.json({ success: true, message: 'Profile settings updated successfully.' });
});

// Intra-System Messenger Endpoints (Barangay Admin <-> BHW Staff)
app.get('/api/messages', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query("SELECT * FROM messages ORDER BY id ASC");
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL messages fetch error:', err.message);
    }
  }
  res.json(mockData.messages);
});

app.post('/api/messages', async (req, res) => {
  const { sender_name, sender_role, recipient_role, message } = req.body;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        "INSERT INTO messages (sender_name, sender_role, recipient_role, message) VALUES (?, ?, ?, ?)",
        [sender_name, sender_role, recipient_role || 'all', message]
      );
      return res.status(201).json({ id: result.insertId, sender_name, sender_role, recipient_role, message, timestamp: new Date().toISOString() });
    } catch (err) {
      console.warn('MySQL message insert error:', err.message);
    }
  }

  const newMsg = { id: mockData.messages.length + 1, sender_name, sender_role, recipient_role: recipient_role || 'all', message, timestamp: new Date().toLocaleString() };
  mockData.messages.push(newMsg);
  res.status(201).json(newMsg);
});

// Full Resident Profile Details (Demographics + Clearance History + Health Records)
app.get('/api/residents/:id/full-profile', async (req, res) => {
  const id = Number(req.params.id);
  const pool = getPool();

  if (pool && getStatus().connected) {
    try {
      const [[resident]] = await pool.query("SELECT * FROM residents WHERE id = ?", [id]);
      if (resident) {
        const [documents] = await pool.query("SELECT * FROM document_requests WHERE resident_id = ?", [id]);
        const [maternal] = await pool.query("SELECT * FROM maternal_records WHERE resident_id = ?", [id]);
        const [immunizations] = await pool.query("SELECT * FROM immunizations WHERE child_name LIKE ?", [`%${resident.first_name}%`]);
        return res.json({ resident, documents, maternal, immunizations });
      }
    } catch (err) {
      console.warn('MySQL full-profile error:', err.message);
    }
  }

  const resident = mockData.residents.find(r => r.id === id) || mockData.residents[0];
  const documents = mockData.documents.filter(d => d.resident_id === resident.id || d.resident_name.includes(resident.first_name));
  const maternal = mockData.maternal.filter(m => m.resident_id === resident.id || m.mother_name.includes(resident.first_name));
  const immunizations = mockData.immunizations.filter(i => i.child_name.includes(resident.first_name) || i.child_name.includes(resident.last_name));

  res.json({ resident, documents, maternal, immunizations });
});

// GET /api/auth/check-status?email=xxx  — live verification status for resident portals
app.get('/api/auth/check-status', async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query(
        'SELECT id, name, email, role, verification_status, status FROM users WHERE LOWER(email) = ?',
        [email]
      );
      if (rows.length > 0) {
        return res.json({ success: true, user: rows[0] });
      }
    } catch (err) {
      console.warn('check-status error:', err.message);
    }
  }

  // Fallback: check mockData
  const user = mockData.users.find(u => u.email.toLowerCase() === email);
  if (user) {
    return res.json({ success: true, user });
  }
  res.status(404).json({ success: false, message: 'User not found.' });
});

// -------------------------------------------------------------
// Statistics Endpoints
// -------------------------------------------------------------
app.get('/api/stats/admin', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [[pendingDocs]] = await pool.query("SELECT COUNT(*) as count FROM document_requests WHERE status = 'Pending'");
      const [[processedDocs]] = await pool.query("SELECT COUNT(*) as count FROM document_requests WHERE status = 'Completed' AND DATE(processed_at) = CURDATE()");
      const [[totalResidents]] = await pool.query("SELECT COUNT(*) as count FROM residents");
      const [[activeRecords]] = await pool.query("SELECT COUNT(*) as count FROM document_requests");
      return res.json({
        pendingDocs: pendingDocs.count,
        processedToday: processedDocs.count,
        totalResidents: totalResidents.count,
        activeRecords: activeRecords.count
      });
    } catch (err) {
      console.warn('MySQL stats query error:', err.message);
    }
  }

  res.json({
    pendingDocs: mockData.documents.filter(d => d.status === 'Pending').length,
    processedToday: mockData.documents.filter(d => d.status === 'Completed').length,
    totalResidents: mockData.residents.length,
    activeRecords: mockData.documents.length
  });
});

app.get('/api/stats/bhw', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [[children]] = await pool.query("SELECT COUNT(DISTINCT child_name) as count FROM immunizations");
      const [[maternal]] = await pool.query("SELECT COUNT(*) as count FROM maternal_records");
      const [[vaccinationsMonth]] = await pool.query("SELECT COUNT(*) as count FROM immunizations WHERE status = 'Completed'");
      const [[overdue]] = await pool.query("SELECT COUNT(*) as count FROM immunizations WHERE status = 'Overdue'");
      return res.json({
        childrenMonitored: children.count || 245,
        maternalRecords: maternal.count || 89,
        vaccinationsMonth: vaccinationsMonth.count || 156,
        overdueImmunizations: overdue.count || 12
      });
    } catch (err) {
      console.warn('MySQL bhw stats query error:', err.message);
    }
  }

  res.json({
    childrenMonitored: 245,
    maternalRecords: mockData.maternal.length,
    vaccinationsMonth: mockData.immunizations.filter(i => i.status === 'Completed').length,
    overdueImmunizations: mockData.immunizations.filter(i => i.status === 'Overdue').length
  });
});

// -------------------------------------------------------------
// Documents CRUD
// -------------------------------------------------------------
app.get('/api/documents', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query("SELECT * FROM document_requests ORDER BY id DESC");
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL documents fetch error:', err.message);
    }
  }
  res.json(mockData.documents);
});

app.post('/api/documents', async (req, res) => {
  const { resident_name, document_type, purpose } = req.body;
  const requestCode = `DOC-${String(mockData.documents.length + 101).padStart(3, '0')}`;
  
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        "INSERT INTO document_requests (request_code, resident_id, resident_name, document_type, purpose, status) VALUES (?, 1, ?, ?, ?, 'Pending')",
        [requestCode, resident_name, document_type, purpose]
      );
      const newDoc = { id: result.insertId, request_code: requestCode, resident_name, document_type, purpose, status: 'Pending', requested_at: new Date().toISOString() };
      return res.status(201).json(newDoc);
    } catch (err) {
      console.warn('MySQL document insert error:', err.message);
    }
  }

  const newDoc = {
    id: mockData.documents.length + 1,
    request_code: requestCode,
    resident_id: 1,
    resident_name,
    document_type,
    purpose: purpose || 'General Requirement',
    status: 'Pending',
    requested_at: new Date().toLocaleString(),
    processed_at: null,
    processed_by: ''
  };
  mockData.documents.unshift(newDoc);
  res.status(201).json(newDoc);
});

app.put('/api/documents/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { status, processed_by } = req.body;

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      // Get document request info
      const [docRows] = await pool.query("SELECT * FROM document_requests WHERE id = ?", [id]);
      const docData = docRows[0];

      await pool.query(
        "UPDATE document_requests SET status = ?, processed_at = NOW(), processed_by = ? WHERE id = ?",
        [status, processed_by || 'Barangay Office', id]
      );

      // Auto-dispatch SMS notification to resident
      if (docData) {
        try {
          const recipientName = docData.resident_name || 'Resident';
          let phone = '09171234567';

          // Look up resident phone
          if (docData.resident_id) {
            const [rRows] = await pool.query("SELECT phone FROM residents WHERE id = ?", [docData.resident_id]);
            if (rRows[0]?.phone) phone = rRows[0].phone;
          }
          if (phone === '09171234567' && docData.resident_name) {
            const [nameRows] = await pool.query("SELECT phone FROM residents WHERE CONCAT(first_name, ' ', last_name) LIKE ? OR first_name LIKE ?", [`%${docData.resident_name}%`, `%${docData.resident_name}%`]);
            if (nameRows[0]?.phone) phone = nameRows[0].phone;
          }

          let smsMsg = '';
          let alertType = 'Document Ready';

          if (status === 'Completed') {
            smsMsg = `Good day ${recipientName}! Your requested ${docData.document_type} (Ref: ${docData.request_code}) has been APPROVED and is now READY FOR PICKUP / RELEASE at the Barangay Hall. Please present a valid ID and reference number.`;
            alertType = 'Document Ready';
          } else if (status === 'Processing') {
            smsMsg = `Good day ${recipientName}! Your requested ${docData.document_type} (Ref: ${docData.request_code}) is now being PROCESSED by ${processed_by || 'Barangay Staff'}. You will receive another text once ready for release.`;
            alertType = 'Document Processing';
          } else {
            smsMsg = `Update on your ${docData.document_type} (Ref: ${docData.request_code}): Status updated to ${status}.`;
            alertType = 'Document Update';
          }
          
          await pool.query(
            "INSERT INTO sms_notifications (recipient_name, recipient_phone, type, message, status) VALUES (?, ?, ?, ?, 'Sent')",
            [recipientName, phone, alertType, smsMsg]
          );
          // Dispatch live SMS via iProgTech Gateway
          sendLiveSms(phone, smsMsg).catch(e => console.warn('iProg SMS document text error:', e.message));
          console.log(`[Auto-SMS] Dispatched to ${recipientName} (${phone}): ${smsMsg}`);
        } catch (smsErr) {
          console.warn('Auto SMS dispatch warning:', smsErr.message);
        }
      }

      return res.json({ success: true, message: 'Document request updated. Auto SMS text sent to resident.' });
    } catch (err) {
      console.warn('MySQL document update error:', err.message);
    }
  }

  const doc = mockData.documents.find(d => d.id === id);
  if (doc) {
    doc.status = status;
    doc.processed_at = new Date().toLocaleString();
    doc.processed_by = processed_by || 'Admin User';
    return res.json(doc);
  }
  res.status(404).json({ error: 'Document not found' });
});

app.delete('/api/documents/:id', async (req, res) => {
  const id = Number(req.params.id);
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query("DELETE FROM document_requests WHERE id = ?", [id]);
      return res.json({ success: true });
    } catch (err) {
      console.warn('MySQL document delete error:', err.message);
    }
  }
  mockData.documents = mockData.documents.filter(d => d.id !== id);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Residents CRUD
// -------------------------------------------------------------
app.get('/api/residents', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query("SELECT * FROM residents ORDER BY id DESC");
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL residents fetch error:', err.message);
    }
  }
  res.json(mockData.residents);
});

app.post('/api/residents', async (req, res) => {
  const { first_name, middle_name, last_name, date_of_birth, gender, civil_status, address, household_id, phone, email } = req.body;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        "INSERT INTO residents (first_name, middle_name, last_name, date_of_birth, gender, civil_status, address, household_id, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [first_name, middle_name || '', last_name, date_of_birth, gender, civil_status || 'Single', address, household_id, phone || '', email || '']
      );
      return res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
      console.warn('MySQL resident insert error:', err.message);
    }
  }

  const newRes = { id: mockData.residents.length + 1, ...req.body };
  mockData.residents.unshift(newRes);
  res.status(201).json(newRes);
});

// -------------------------------------------------------------
// System Users CRUD
// -------------------------------------------------------------
app.get('/api/users', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query("SELECT id, name, email, role, status, last_login FROM users ORDER BY id DESC");
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL users fetch error:', err.message);
    }
  }
  res.json(mockData.users);
});

app.post('/api/users', async (req, res) => {
  const { name, email, role, status } = req.body;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, 'hashed_pass_default', ?, ?)",
        [name, email, role, status || 'Active']
      );
      return res.status(201).json({ id: result.insertId, name, email, role, status: status || 'Active', last_login: 'Never' });
    } catch (err) {
      console.warn('MySQL user insert error:', err.message);
    }
  }

  const newUser = { id: mockData.users.length + 1, name, email, role, status: status || 'Active', last_login: 'Never' };
  mockData.users.push(newUser);
  res.status(201).json(newUser);
});

app.delete('/api/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query("DELETE FROM users WHERE id = ?", [id]);
      return res.json({ success: true });
    } catch (err) {
      console.warn('MySQL user delete error:', err.message);
    }
  }
  mockData.users = mockData.users.filter(u => u.id !== id);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Health Monitoring: Immunizations
// -------------------------------------------------------------
app.get('/api/immunizations', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query("SELECT * FROM immunizations ORDER BY id DESC");
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL immunizations fetch error:', err.message);
    }
  }
  res.json(mockData.immunizations);
});

app.post('/api/immunizations', async (req, res) => {
  const { child_name, parent_phone, vaccine_name, dose_number, due_date, status } = req.body;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        "INSERT INTO immunizations (child_name, parent_phone, vaccine_name, dose_number, status, due_date) VALUES (?, ?, ?, ?, ?, ?)",
        [child_name, parent_phone || '', vaccine_name, dose_number || 1, status || 'Scheduled', due_date]
      );

      // Auto-dispatch SMS reminder
      if (parent_phone) {
        try {
          const smsMsg = `Barangay Health Center Alert: Scheduled ${vaccine_name} (Dose ${dose_number || 1}) immunization for ${child_name} on ${due_date || 'this week'}. Please bring your Baby Health Card.`;
          await pool.query(
            "INSERT INTO sms_notifications (recipient_name, recipient_phone, type, message, status) VALUES (?, ?, 'Immunization Reminder', ?, 'Sent')",
            [child_name, parent_phone, smsMsg]
          );
          sendLiveSms(parent_phone, smsMsg).catch(e => console.warn('iProg SMS immunization error:', e.message));
        } catch (smsErr) {
          console.warn('Auto SMS dispatch warning:', smsErr.message);
        }
      }

      return res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
      console.warn('MySQL immunization insert error:', err.message);
    }
  }

  const newImm = { id: mockData.immunizations.length + 1, child_name, parent_phone: parent_phone || '', vaccine_name, dose_number: Number(dose_number) || 1, status: status || 'Scheduled', date_administered: status === 'Completed' ? new Date().toISOString().split('T')[0] : null, due_date, days_overdue: 0, administered_by: status === 'Completed' ? 'BHW Maria' : '' };
  mockData.immunizations.unshift(newImm);
  res.status(201).json(newImm);
});

app.put('/api/immunizations/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { status, administered_by } = req.body;

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query(
        "UPDATE immunizations SET status = ?, date_administered = CURDATE(), administered_by = ? WHERE id = ?",
        [status, administered_by || 'BHW Maria', id]
      );
      return res.json({ success: true });
    } catch (err) {
      console.warn('MySQL immunization update error:', err.message);
    }
  }

  const imm = mockData.immunizations.find(i => i.id === id);
  if (imm) {
    imm.status = status;
    imm.date_administered = new Date().toISOString().split('T')[0];
    imm.administered_by = administered_by || 'BHW Maria';
    imm.days_overdue = 0;
    return res.json(imm);
  }
  res.status(404).json({ error: 'Record not found' });
});

// -------------------------------------------------------------
// Health Monitoring: Maternal Records
// -------------------------------------------------------------
app.get('/api/maternal', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query("SELECT * FROM maternal_records ORDER BY id DESC");
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL maternal fetch error:', err.message);
    }
  }
  res.json(mockData.maternal);
});

app.post('/api/maternal', async (req, res) => {
  const { mother_name, age, pregnancy_status, expected_due_date, last_visit, next_visit, risk_level, notes } = req.body;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        "INSERT INTO maternal_records (resident_id, mother_name, age, pregnancy_status, expected_due_date, last_visit, next_visit, risk_level, notes) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)",
        [mother_name, age, pregnancy_status, expected_due_date || null, last_visit, next_visit, risk_level || 'Low', notes || '']
      );
      return res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
      console.warn('MySQL maternal insert error:', err.message);
    }
  }

  const newMat = { id: mockData.maternal.length + 1, resident_id: 1, mother_name, age: Number(age), pregnancy_status, expected_due_date, last_visit, next_visit, risk_level: risk_level || 'Low', notes: notes || '' };
  mockData.maternal.unshift(newMat);
  res.status(201).json(newMat);
});

// -------------------------------------------------------------
// SMS Notifications
// -------------------------------------------------------------
app.get('/api/notifications', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query("SELECT * FROM sms_notifications ORDER BY id DESC");
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL notifications fetch error:', err.message);
    }
  }
  res.json(mockData.notifications);
});

app.post('/api/notifications', async (req, res) => {
  const { recipient_name, recipient_phone, type, message } = req.body;
  
  // Dispatch live SMS via iProgTech Gateway
  sendLiveSms(recipient_phone, message).catch(e => console.warn('iProg SMS dispatch error:', e.message));

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        "INSERT INTO sms_notifications (recipient_name, recipient_phone, type, message, status) VALUES (?, ?, ?, ?, 'Sent')",
        [recipient_name, recipient_phone, type, message]
      );
      return res.status(201).json({ id: result.insertId, recipient_name, recipient_phone, type, message, status: 'Sent', sent_at: new Date().toISOString() });
    } catch (err) {
      console.warn('MySQL SMS insert error:', err.message);
    }
  }

  const newSms = { id: mockData.notifications.length + 1, recipient_name, recipient_phone, type, message, status: 'Sent', sent_at: new Date().toLocaleString() };
  mockData.notifications.unshift(newSms);
  res.status(201).json(newSms);
});

// -------------------------------------------------------------
// Intercom Messages (Barangay <-> Health Center staff chat)
// -------------------------------------------------------------
app.get('/api/messages', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query('SELECT * FROM messages ORDER BY timestamp ASC');
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL messages fetch error:', err.message);
    }
  }
  res.json(mockData.messages);
});

app.post('/api/messages', async (req, res) => {
  const { sender_name, sender_role, recipient_role, message } = req.body || {};
  if (!sender_name || !message) {
    return res.status(400).json({ error: 'sender_name and message are required' });
  }
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        'INSERT INTO messages (sender_name, sender_role, recipient_role, message, timestamp) VALUES (?, ?, ?, ?, NOW())',
        [sender_name, sender_role || 'staff', recipient_role || 'admin', message]
      );
      const [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
      return res.status(201).json(rows[0]);
    } catch (err) {
      console.warn('MySQL messages insert error:', err.message);
    }
  }
  const newMsg = {
    id: Date.now(),
    sender_name,
    sender_role: sender_role || 'staff',
    recipient_role: recipient_role || 'admin',
    message,
    timestamp: new Date().toISOString()
  };
  mockData.messages.push(newMsg);
  res.status(201).json(newMsg);
});

// -------------------------------------------------------------
// AI Chatbot — Knowledge-Based FAQ Engine
// -------------------------------------------------------------
const knowledgeBase = [
  // Document requirements
  {
    keywords: ['clearance', 'barangay clearance', 'police clearance', 'nbi clearance'],
    topic: 'Barangay Clearance',
    answer: `📄 *Barangay Clearance Requirements:*\n\n✅ Valid Government-Issued ID (PhilSys, Passport, Driver\'s License, Voter\'s ID, SSS, or GSIS)\n✅ Community Tax Certificate (Cedula) — available at Barangay Hall\n✅ Proof of Residency (utility bill or lease contract)\n✅ Duly accomplished request form\n\n🕐 *Processing Time:* Same day (1–2 hours)\n💰 *Fee:* Php 50.00\n📍 *Where:* Barangay Hall, Room 1 – Document Section\n\nYou can also submit your request online via the *Barangay Portal* in this system!`
  },
  {
    keywords: ['residency', 'certificate of residency', 'proof of residence'],
    topic: 'Certificate of Residency',
    answer: `🏠 *Certificate of Residency Requirements:*\n\n✅ Valid Government ID with address\n✅ Utility bill (electricity/water) — not older than 3 months\n✅ Lease contract (if renting)\n✅ 2 pcs 1x1 ID photo\n\n🕐 *Processing Time:* 1–2 hours\n💰 *Fee:* Php 50.00\n\nYou can submit this request directly from the *Barangay Portal* in this system!`
  },
  {
    keywords: ['business permit', 'business', 'store', 'sari-sari', 'permit'],
    topic: 'Business Permit',
    answer: `🏪 *Barangay Business Permit Requirements:*\n\n✅ DTI Registration (for sole proprietorship) or SEC Registration (for corporations)\n✅ Lease/Property Title or Owner\'s Consent Letter\n✅ Valid Owner Government ID\n✅ Community Tax Certificate (Cedula)\n\n🕐 *Processing Time:* 1–2 business days\n💰 *Fee:* Php 200.00 – Php 500.00 (based on business type)\n\n📍 Submit your request at *Room 1, Barangay Hall* or via the Barangay Portal online!`
  },
  {
    keywords: ['indigency', 'certificate of indigency', 'poor', 'financial assistance'],
    topic: 'Certificate of Indigency',
    answer: `📋 *Certificate of Indigency Requirements:*\n\n✅ Valid ID of the requesting resident\n✅ Proof of residency in the barangay\n✅ Recommendation letter (for scholarship applications)\n\n🕐 *Processing Time:* Same day\n💰 *Fee:* FREE (no charge)\n\nThis document is free for indigent residents. Available at Barangay Hall, Room 1.`
  },
  {
    keywords: ['barangay id', 'id card', 'identification'],
    topic: 'Barangay ID',
    answer: `🪪 *Barangay ID Requirements:*\n\n✅ Proof of residency (2 months minimum)\n✅ 2 pcs 2x2 ID photos\n✅ Valid government ID for verification\n✅ Accomplished application form\n\n🕐 *Processing Time:* 3–5 business days\n💰 *Fee:* Php 50.00\n\nThe Barangay ID is accepted as valid identification within government agencies.`
  },
  // Health Center
  {
    keywords: ['health center', 'clinic', 'bhw', 'health worker', 'nurse', 'doctor', 'health'],
    topic: 'Health Center',
    answer: `🏥 *Barangay Health Center Information:*\n\n🕐 *Operating Hours:* Monday – Friday, 8:00 AM – 5:00 PM\n📍 *Location:* Barangay Hall Annex Building\n\n*Services Available:*\n💊 Free consultations & medical checkups\n💉 Infant immunization (Wednesdays & Fridays, 8AM–12PM)\n🤰 Prenatal & postnatal care\n📋 Medical certificates & health clearances\n🩺 Blood pressure & blood sugar monitoring\n\nFor health documents, use the *Health Center Portal* in this system!`
  },
  {
    keywords: ['vaccine', 'vaccination', 'immunization', 'bcg', 'polio', 'mmr', 'hepatitis', 'dpt', 'infant', 'baby', 'child'],
    topic: 'Immunization',
    answer: `💉 *Free Infant Immunization Schedule:*\n\n📅 *Schedule:* Every Wednesday & Friday, 8:00 AM – 12:00 PM\n📍 *Location:* Barangay Health Center\n\n*Available Free Vaccines:*\n• BCG (Bacillus Calmette-Guérin)\n• Hepatitis B\n• DPT (Diphtheria, Pertussis, Tetanus)\n• Oral Polio Vaccine (OPV)\n• MMR (Measles, Mumps, Rubella)\n\n📋 *Please bring:* Mother-Baby Handbook / Immunization Card\n\nFor missed doses or overdue vaccines, contact the Barangay Health Center immediately.`
  },
  {
    keywords: ['prenatal', 'pregnant', 'pregnancy', 'maternal', 'postnatal', 'mother', 'baby checkup', 'ob'],
    topic: 'Maternal Health',
    answer: `🤰 *Maternal & Prenatal Care Services:*\n\n*Prenatal Visits:*\n• 1st Trimester: Every 4 weeks\n• 2nd Trimester: Every 3 weeks\n• 3rd Trimester: Every 2 weeks\n\n*What to Bring:*\n📋 Mother-Baby Handbook\n📋 Previous checkup records\n\n*Postnatal Care:*\n• Newborn checkup within 72 hours of birth\n• Follow-up at 1 week, 1 month, and 2 months\n\n🏥 *Location:* Barangay Health Center (8AM–5PM, Mon-Fri)\n\nFor high-risk pregnancies, immediate consultation with BHW Nurse Maria Santos is recommended.`
  },
  // System usage
  {
    keywords: ['register', 'sign up', 'create account', 'new account', 'how to register'],
    topic: 'Account Registration',
    answer: `📝 *How to Register a Resident Account:*\n\n1. Go to the *Login Page* of Smart Barangay System\n2. Click *"Register as Resident"* tab\n3. Fill in your full name, email address, phone number, and address\n4. Upload a photo of your valid Government ID\n5. Click *"Register Account"*\n\n⏳ Your account will be in *Pending Review* status.\nThe Barangay Admin will verify your ID and activate your account.\n\n📧 You will be notified once your account is verified and you can start requesting documents!`
  },
  {
    keywords: ['request document', 'how to request', 'submit request', 'online request'],
    topic: 'Requesting Documents',
    answer: `📋 *How to Request a Document Online:*\n\n1. Log in to your *Resident Account*\n2. Choose the portal: *Barangay Portal* or *Health Center Portal*\n3. Click *"Request Document"* button\n4. Select document type and enter your purpose\n5. Click *"Submit Request"*\n\n📍 You can also visit the *Barangay Hall* in person.\n\n⚠️ *Note:* Your account must be *Verified* by the Barangay Admin before you can submit online requests. Unverified accounts are locked.`
  },
  {
    keywords: ['print', 'download', 'certificate', 'print document', 'get certificate'],
    topic: 'Printing Documents',
    answer: `🖨️ *How to Print or Download Your Document:*\n\n1. Log in and go to your portal (Barangay or Health Center)\n2. Find your document in the *"My Document Requests"* table\n3. Click the *"Print / Export"* button on the right side\n4. A document preview will appear\n5. Click *"Print Official Copy"* to print, or *"Download File"* to save\n\n📋 For completed requests, you can pick up physical copies at the Barangay Hall between 8AM–5PM.`
  },
  {
    keywords: ['track', 'status', 'check status', 'pending', 'processing', 'completed'],
    topic: 'Document Status',
    answer: `🔍 *Document Request Status Meanings:*\n\n🟡 *Pending* — Your request has been submitted and is waiting for staff review\n🔵 *Processing* — Staff is actively preparing your document\n✅ *Completed* — Your document is ready for pickup or printing\n❌ *Rejected* — The request was not approved (contact Barangay Office)\n\nYou can track your document status anytime by logging into your *Resident Account* and visiting the portal where you submitted the request.`
  },
  {
    keywords: ['fee', 'how much', 'cost', 'price', 'payment'],
    topic: 'Fees & Payment',
    answer: `💰 *Barangay Document Fees:*\n\n• Barangay Clearance — Php 50.00\n• Certificate of Residency — Php 50.00\n• Business Permit — Php 200–500 (varies)\n• Certificate of Indigency — **FREE**\n• Barangay ID — Php 50.00\n\n🏥 *Health Center Services (All FREE):*\n• Medical certificates\n• Health clearances\n• Immunizations\n• Prenatal & postnatal care\n\n💳 *Payment:* Cash only at the Barangay Hall cashier.`
  },
  {
    keywords: ['hours', 'open', 'schedule', 'office hours', 'time', 'when'],
    topic: 'Office Hours',
    answer: `🕐 *Barangay Hall Office Hours:*\n📅 Monday – Friday: 8:00 AM – 5:00 PM\n📅 Saturday: 8:00 AM – 12:00 PM\n❌ Sunday & Holidays: Closed\n\n🏥 *Health Center Hours:*\n📅 Monday – Friday: 8:00 AM – 5:00 PM\n💉 Immunizations: Wednesday & Friday, 8:00 AM – 12:00 PM\n\n📞 *Emergency Contact:* Barangay Hotline: (02) 1234-5678`
  },
  {
    keywords: ['contact', 'phone', 'address', 'location', 'where', 'how to reach', 'pianing', 'butuan'],
    topic: 'Contact Information',
    answer: `📞 *Barangay Pianing, Butuan City Contact Information:*\n\n🏛️ *Barangay Hall:* Barangay Pianing, Butuan City, Agusan del Norte, Philippines 8600\n📞 *Hotline:* (085) 341-2345 / 0917-123-4567\n📧 *Email:* info@barangaypianing.gov.ph\n\n👤 *Key Officials:*\n• Punong Barangay / Captain: Hon. Juan Dela Cruz — (0917) 123-4567\n• Barangay Secretary: Ana Reyes — (0918) 234-5678\n• BHW Nurse: Maria Santos — (0919) 345-6789\n\n🕐 *Office Hours:* Mon–Fri, 8:00 AM – 5:00 PM | Sat, 8:00 AM – 12:00 PM`
  },
  {
    keywords: ['verify', 'verification', 'approve account', 'account verified', 'unverified'],
    topic: 'Account Verification',
    answer: `✅ *Account Verification Process:*\n\nAfter registering, your account goes through verification:\n\n1. You upload your Government ID during registration\n2. Barangay Admin reviews your submitted ID\n3. Your account status changes from *Pending* to *Verified*\n\n⏳ *Verification Time:* Usually within 1–2 business days\n\n⚠️ Until verified, you cannot submit document requests online.\n\nIf your verification is taking too long, visit the Barangay Hall in person with your original government ID.`
  },
  {
    keywords: ['sms', 'notification', 'text message', 'alert'],
    topic: 'SMS Notifications',
    answer: `📱 *SMS Notification Service:*\n\nThe Barangay sends SMS alerts for:\n• Document request status updates\n• Immunization reminders for your child\n• Barangay announcements\n• Health center appointment reminders\n\nTo receive SMS notifications, make sure your registered mobile number is correct. Contact the Barangay Office to update your phone number.`
  }
];

function findBestAnswer(question) {
  const q = question.toLowerCase().trim();
  const words = q.split(/\s+/);
  let bestMatch = null;
  let bestScore = 0;

  for (const kb of knowledgeBase) {
    let score = 0;
    for (const keyword of kb.keywords) {
      const kw = keyword.toLowerCase();
      // Exact phrase match
      if (q.includes(kw)) {
        score += kw.length * 3;
      }
      // Word match
      if (words.includes(kw)) {
        score += 10;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = kb;
    }
  }

  // Only return if score is meaningful
  if (bestScore >= 6) {
    return bestMatch;
  }
  return null;
}

app.post('/api/chatbot', async (req, res) => {
  const { question } = req.body || {};
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Question is required' });
  }

  // 1. Use rich built-in knowledge base first for comprehensive, formatted answers
  const match = findBestAnswer(question);
  if (match) {
    return res.json({ answer: match.answer, topic: match.topic, source: 'knowledge_base' });
  }

  // 2. Try MySQL FAQ if custom entries exist
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query('SELECT * FROM faq_knowledge');
      const q = question.toLowerCase();
      for (const row of rows) {
        const keywords = (row.keywords || '').toLowerCase().split(',').map(k => k.trim());
        if (keywords.some(k => k && q.includes(k))) {
          return res.json({ answer: row.response, topic: row.topic, source: 'database' });
        }
      }
    } catch (err) {
      console.warn('FAQ DB query error:', err.message);
    }
  }

  // 3. Fallback in-memory FAQ
  const q = question.toLowerCase();
  const faqMatch = mockData.faq.find(f => f.keywords.some(k => q.includes(k)));
  if (faqMatch) {
    return res.json({ answer: faqMatch.response, topic: faqMatch.topic, source: 'faq' });
  }

  // 4. Default helpful fallback response
  return res.json({
    answer: `🤔 I'm not sure about that specific question. Here's what I can help you with:\n\n📄 *Document Requests* — Barangay Clearance, Residency, Business Permit, Indigency Cert, Barangay ID\n🏥 *Health Services* — Immunizations, Prenatal care, Medical certificates\n🕐 *Office Hours* — Mon–Fri 8AM–5PM\n📞 *Contact* — (02) 1234-5678\n\nTry asking: "How to get Barangay Clearance?" or "What vaccines are free?"`,
    topic: 'General',
    source: 'fallback'
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Smart Barangay System Express API running on http://localhost:${PORT}`);
  const statusRes = await testConnection();
  if (statusRes.connected) {
    console.log(`✅ [MySQL] Connected successfully to ${statusRes.host}:${statusRes.port}/${statusRes.database}`);
  } else {
    console.log(`ℹ️ [MySQL Status] Attempting automatic migration & setup for database '${process.env.DB_NAME || 'smart_db'}'...`);
    const { runMigration } = await import('./migrate.js');
    const migRes = await runMigration();
    if (migRes.success) {
      await testConnection();
    } else {
      console.log(`ℹ️ [Note] ${migRes.error}. System running seamlessly with built-in memory storage engine.`);
    }
  }
});
