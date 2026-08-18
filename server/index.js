import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection, getPool, getStatus } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-Memory Fallback Store (active if MySQL is unavailable)
let mockData = {
  users: [
    { id: 1, name: 'Super Admin Rodrigo Lim', email: 'superadmin@barangay.gov', role: 'superadmin', status: 'Active', last_login: '2026-05-06 08:00 AM' },
    { id: 2, name: 'Admin Juan Dela Cruz', email: 'juan.admin@barangay.gov', role: 'admin', status: 'Active', last_login: '2026-05-06 09:00 AM' },
    { id: 3, name: 'Pedro Bautista', email: 'pedro.staff@barangay.gov', role: 'staff', status: 'Active', last_login: '2026-05-06 08:45 AM' },
    { id: 4, name: 'BHW Maria Santos', email: 'maria.bhw@barangay.gov', role: 'bhw', status: 'Active', last_login: '2026-05-06 08:30 AM' },
    { id: 5, name: 'Juan Resident', email: 'juan.resident@gmail.com', role: 'resident', status: 'Active', last_login: '2026-05-05 02:30 PM' }
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
    { id: 101, name: 'Josefina Villanueva', email: 'josefina@gmail.com', phone: '09311234567', address: 'Zone 3, Maharlika St', submitted_id: null, submitted_at: '2026-05-06 10:45 AM', verification_status: 'Pending_Review' }
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
  const { email, password } = req.body;
  const pool = getPool();
  
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (rows.length > 0) {
        const user = rows[0];
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);
        return res.json({ success: true, user, message: 'Authentication successful' });
      }
    } catch (err) {
      console.warn('MySQL auth query error:', err.message);
    }
  }

  // Fallback check
  const user = mockData.users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (user) {
    user.last_login = new Date().toLocaleString();
    return res.json({ success: true, user, message: 'Login successful' });
  }

  // Generic admin/bhw/resident/superadmin/staff login acceptance (derive role from email)
  const lowerEmail = (email || '').toLowerCase();
  let detectedRole = 'resident';
  if (lowerEmail.includes('superadmin')) detectedRole = 'superadmin';
  else if (lowerEmail.includes('admin')) detectedRole = 'admin';
  else if (lowerEmail.includes('staff')) detectedRole = 'staff';
  else if (lowerEmail.includes('bhw')) detectedRole = 'bhw';

  res.json({
    success: true,
    user: {
      id: detectedRole === 'superadmin' ? 1 : detectedRole === 'admin' ? 2 : detectedRole === 'staff' ? 3 : detectedRole === 'bhw' ? 4 : 5,
      name: detectedRole === 'superadmin' ? 'Super Admin Rodrigo' : detectedRole === 'admin' ? 'Admin Juan' : detectedRole === 'staff' ? 'Pedro Staff' : detectedRole === 'bhw' ? 'BHW Maria' : 'Juan Resident',
      email,
      role: detectedRole,
      status: 'Active',
      verification_status: detectedRole === 'resident' ? 'Unverified' : 'Verified'
    },
    message: 'Login successful'
  });
});

// Resident Account Registration
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, address, phone, submitted_id } = req.body;
  const pool = getPool();
  
  if (pool && getStatus().connected) {
    try {
      const [resResult] = await pool.query(
        "INSERT INTO residents (first_name, last_name, address, phone, email, household_id, verification_status) VALUES (?, 'Resident', ?, ?, ?, 'HH-NEW', 'Pending_Review')",
        [name, address || 'Zone 1, Barangay Main', phone || '', email]
      );
      return res.status(201).json({
        success: true,
        user: { id: resResult.insertId, name, email, role: role || 'resident', verification_status: 'Pending_Review' },
        message: 'Account created! Your ID is under review by the Barangay Admin.'
      });
    } catch (err) {
      console.warn('MySQL register error:', err.message);
    }
  }

  // Fallback: store in pendingRegistrations
  const newPending = {
    id: Date.now(),
    name,
    email,
    phone: phone || '',
    address: address || 'Zone 1, Barangay Main',
    submitted_id: submitted_id || null,
    submitted_at: new Date().toLocaleString(),
    verification_status: 'Pending_Review'
  };
  mockData.pendingRegistrations.push(newPending);

  res.status(201).json({
    success: true,
    user: { id: newPending.id, name, email, role: role || 'resident', verification_status: 'Pending_Review' },
    message: 'Account created! Your submitted ID is under review by the Barangay Admin.'
  });
});

// GET pending resident registrations (for Admin approval)
app.get('/api/residents/pending', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query("SELECT * FROM residents WHERE verification_status = 'Pending_Review' ORDER BY id DESC");
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL pending residents error:', err.message);
    }
  }
  res.json(mockData.pendingRegistrations);
});

// Approve resident registration
app.put('/api/residents/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query("UPDATE residents SET verification_status = 'Verified' WHERE id = ?", [id]);
      return res.json({ success: true, message: 'Resident account approved' });
    } catch (err) {
      console.warn('MySQL approve error:', err.message);
    }
  }
  // Fallback: update in mockData
  const idx = mockData.pendingRegistrations.findIndex(r => String(r.id) === String(id));
  if (idx !== -1) {
    mockData.pendingRegistrations[idx].verification_status = 'Verified';
  }
  res.json({ success: true, message: 'Resident account approved' });
});

// Reject resident registration
app.put('/api/residents/:id/reject', async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query("UPDATE residents SET verification_status = 'Rejected' WHERE id = ?", [id]);
      return res.json({ success: true, message: 'Resident registration rejected' });
    } catch (err) {
      console.warn('MySQL reject error:', err.message);
    }
  }
  const idx = mockData.pendingRegistrations.findIndex(r => String(r.id) === String(id));
  if (idx !== -1) {
    mockData.pendingRegistrations[idx].verification_status = 'Rejected';
  }
  res.json({ success: true, message: 'Resident registration rejected' });
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

// Smart AI Assistant / FAQ Chatbot Endpoint
app.post('/api/chatbot', (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question required' });

  const q = question.toLowerCase();
  
  // Keyword matching against FAQ knowledge base
  const matchedFaq = mockData.faq.find(item =>
    item.keywords.some(kw => q.includes(kw))
  );

  if (matchedFaq) {
    return res.json({
      answer: matchedFaq.response,
      topic: matchedFaq.topic
    });
  }

  // General default fallback
  res.json({
    answer: "Hello! I am the Smart Barangay Assistant. You can ask me about Barangay Clearance requirements, Health Center clinic hours, free infant immunizations, or Business Permits. For urgent assistance, please contact the Barangay Hall directly.",
    topic: 'General Assistance'
  });
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
      await pool.query(
        "UPDATE document_requests SET status = ?, processed_at = NOW(), processed_by = ? WHERE id = ?",
        [status, processed_by || 'Admin User', id]
      );
      return res.json({ success: true, message: 'Document request updated' });
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
