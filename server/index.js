import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { testConnection, getPool, getStatus } from './config/db.js';
import { sendLiveSms, formatPhoneNumber } from './services/smsService.js';
import {
  sendEmail,
  sendDocumentStatusEmail,
  sendImmunizationReminderEmail,
  sendMaternalReminderEmail,
  sendRegistrationEmail,
  sendVerificationNoticeEmail,
  sendAnnouncementEmail,
  sendAppointmentStatusEmail,
  sendDirectNotificationEmail,
} from './services/emailService.js';
import {
  computeNextDose,
  computeNextMaternalVisit,
  getFullVaccineSchedule,
  getFullPrenatalSchedule,
  getOverdueImmunizations,
  getOverdueMaternalVisits,
  VACCINE_SCHEDULE,
} from './services/schedulingService.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// -------------------------------------------------------------
// Password Hashing & Verification Utilities (Bcrypt)
// -------------------------------------------------------------
async function hashPassword(plainPassword) {
  if (!plainPassword) return '';
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(String(plainPassword), salt);
}

async function verifyPassword(inputPassword, storedHashOrPlain) {
  if (!inputPassword || !storedHashOrPlain) return false;
  if (storedHashOrPlain.startsWith('$2a$') || storedHashOrPlain.startsWith('$2b$') || storedHashOrPlain.startsWith('$2y$')) {
    return await bcrypt.compare(String(inputPassword), storedHashOrPlain);
  }
  // Fallback for existing legacy plain-text passwords
  return String(inputPassword) === String(storedHashOrPlain);
}

// Serve compiled Vite frontend in production mode
const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// In-Memory Fallback Store (active if MySQL is unavailable)
let mockData = {
  users: [
    { id: 1, name: 'Super Admin Rodrigo Lim', email: 'superadmin@barangay.gov', role: 'superadmin', status: 'Active', barangay: 'All (City-Wide)', phone: '09171112233', last_login: '2026-08-20 08:00 AM' },
    { id: 2, name: 'Barangay Captain Juan Dela Cruz', email: 'admin@barangay.gov', role: 'admin', status: 'Active', barangay: 'Pianing', phone: '09171234567', last_login: '2026-08-20 09:00 AM' },
    { id: 3, name: 'Barangay Clerk Ana Reyes', email: 'staff@barangay.gov', role: 'staff', status: 'Active', barangay: 'Pianing', phone: '09204567890', last_login: '2026-08-20 08:45 AM' },
    { id: 4, name: 'Nurse Maria Santos', email: 'bhw@barangay.gov', role: 'bhw', status: 'Active', barangay: 'Pianing', phone: '09182345678', last_login: '2026-08-20 08:30 AM' },
    { id: 5, name: 'Juan Resident Dela Cruz', email: 'resident@gmail.com', role: 'resident', status: 'Active', barangay: 'Pianing', phone: '09171234567', verification_status: 'Verified', last_login: '2026-08-19 02:30 PM' },
    { id: 6, name: 'Josefina Villanueva', email: 'josefina@gmail.com', role: 'resident', status: 'Active', barangay: 'Pianing', phone: '09193456789', verification_status: 'Pending_Review', last_login: '2026-08-18 10:00 AM' }
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
    { id: 1, user_name: 'Super Admin Rodrigo Lim', user_role: 'superadmin', action: 'Configured Document Service Categories', action_type: 'Category', barangay: 'All (City-Wide)', details: 'Updated active status for Barangay Clearance and Good Moral Clearance', timestamp: '2026-08-20 08:15 AM' },
    { id: 2, user_name: 'Barangay Captain Juan Dela Cruz', user_role: 'admin', action: 'Approved Resident Registration', action_type: 'Resident', barangay: 'Pianing', details: 'Verified resident account for Juan Dela Cruz with valid Postal ID', timestamp: '2026-08-19 02:45 PM' },
    { id: 3, user_name: 'Barangay Clerk Ana Reyes', user_role: 'staff', action: 'Completed Barangay ID DOC-004', action_type: 'Document', barangay: 'Pianing', details: 'Issued official community ID card for Ana Reyes', timestamp: '2026-08-19 04:30 PM' },
    { id: 4, user_name: 'Nurse Maria Santos', user_role: 'bhw', action: 'Administered BCG Vaccine', action_type: 'Health', barangay: 'Pianing', details: 'Administered BCG Dose 1 to Baby Maria Santos at Health Center', timestamp: '2026-08-18 10:00 AM' },
    { id: 5, user_name: 'Super Admin Rodrigo Lim', user_role: 'superadmin', action: 'Created Barangay Administrator Account', action_type: 'User', barangay: 'Pianing', details: 'Generated administrative credentials for Captain Juan Dela Cruz', timestamp: '2026-08-17 09:30 AM' },
    { id: 6, user_name: 'Barangay Captain Juan Dela Cruz', user_role: 'admin', action: 'Processed Certificate of Residency DOC-002', action_type: 'Document', barangay: 'Pianing', details: 'Validated residency records for Maria Santos (Purok 2)', timestamp: '2026-08-17 11:20 AM' },
    { id: 7, user_name: 'Barangay Clerk Ana Reyes', user_role: 'staff', action: 'Broadcasted Health Alert SMS', action_type: 'System', barangay: 'Pianing', details: 'Sent SMS notification regarding upcoming immunization schedule to 45 registered parents', timestamp: '2026-08-16 08:00 AM' },
    { id: 8, user_name: 'Admin Roberto Garcia', user_role: 'admin', action: 'Approved Business Clearance DOC-003', action_type: 'Document', barangay: 'Anticala', details: 'Approved commercial permit for Pedro Garcia Sari-Sari Store', timestamp: '2026-08-15 03:15 PM' },
    { id: 9, user_name: 'Super Admin Rodrigo Lim', user_role: 'superadmin', action: 'System Security Audit Completed', action_type: 'Security', barangay: 'All (City-Wide)', details: 'Zero security anomalies detected across Pianing & Anticala nodes', timestamp: '2026-08-15 05:00 PM' }
  ],
  messages: [
    { id: 1, sender_name: 'BHW Maria Santos', sender_role: 'bhw', recipient_role: 'admin', message: 'Good morning Captain/Admin Juan! We scheduled an immunization drive for Zone 2 this Friday. Please prepare clearance announcements.', timestamp: '2026-05-06 08:30 AM' },
    { id: 2, sender_name: 'Admin Juan Dela Cruz', sender_role: 'admin', recipient_role: 'bhw', message: 'Noted BHW Maria! We will post the announcement on the resident portal and issue SMS alerts today.', timestamp: '2026-05-06 09:15 AM' }
  ],
  pendingRegistrations: [
    { id: 101, name: 'Josefina Villanueva', email: 'josefina@gmail.com', phone: '09311234567', address: 'Purok 1, Barangay Pianing, Butuan City', submitted_id: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', submitted_at: '2026-05-06 10:45 AM', verification_status: 'Pending_Review' }
  ],
  appointments: [
    { id: 1, appointment_code: 'APT-2026-001', resident_id: 1, resident_name: 'Juan Dela Cruz', resident_phone: '09171234567', resident_email: 'resident@gmail.com', barangay: 'Pianing', service_type: 'Pre-Marriage Counseling (PMC)', preferred_date: '2026-09-02', preferred_time: 'Morning (8:00 AM - 11:30 AM)', scheduled_date: '2026-09-02', scheduled_time: '09:00 AM', status: 'Approved', bhw_notes: 'Confirmed slot for couple counseling seminar. Please bring Certificate of No Marriage (CENOMAR) and valid IDs.', resident_notes: 'Applying for marriage license at Butuan City Hall.', attending_bhw: 'Nurse Maria Santos', created_at: '2026-08-25 09:00 AM' },
    { id: 2, appointment_code: 'APT-2026-002', resident_id: 2, resident_name: 'Maria Santos', resident_phone: '09182345678', resident_email: 'maria.santos@gmail.com', barangay: 'Pianing', service_type: 'Prenatal Check-up', preferred_date: '2026-09-03', preferred_time: 'Morning (8:00 AM - 11:30 AM)', scheduled_date: '2026-09-03', scheduled_time: '10:00 AM', status: 'Approved', bhw_notes: '3rd Trimester prenatal check-up scheduled.', resident_notes: 'Routine monthly checkup.', attending_bhw: 'Nurse Maria Santos', created_at: '2026-08-26 10:30 AM' },
    { id: 3, appointment_code: 'APT-2026-003', resident_id: 5, resident_name: 'Teresa Ramos', resident_phone: '09215678901', resident_email: 'teresa.ramos@gmail.com', barangay: 'Pianing', service_type: 'Child Immunization', preferred_date: '2026-09-04', preferred_time: 'Afternoon (1:00 PM - 4:00 PM)', scheduled_date: null, scheduled_time: null, status: 'Pending', bhw_notes: '', resident_notes: 'Hepatitis B 2nd dose for infant.', attending_bhw: '', created_at: '2026-08-27 02:15 PM' }
  ],
  clinicSchedules: [
    { id: 1, title: 'Pre-Marriage Counseling (PMC) Seminar', service_type: 'Pre-Marriage Counseling (PMC)', day_of_week: 'Every Wednesday', time_slot: '8:30 AM - 11:30 AM', location: 'Barangay Pianing Health Center - Conference Room', slots_available: 15, bhw_in_charge: 'Nurse Maria Santos & PopCom Officer', status: 'Active', barangay: 'Pianing', created_by: 'Nurse Maria Santos', created_at: '2026-08-20' },
    { id: 2, title: 'Expanded Child Immunization Day', service_type: 'Child Immunization', day_of_week: 'Every Thursday', time_slot: '8:00 AM - 3:00 PM', location: 'Barangay Health Center - Immunization Ward', slots_available: 40, bhw_in_charge: 'Nurse Maria Santos', status: 'Active', barangay: 'Pianing', created_by: 'Nurse Maria Santos', created_at: '2026-08-20' },
    { id: 3, title: 'Maternal & Prenatal Care Clinic', service_type: 'Prenatal Check-up', day_of_week: 'Every Tuesday & Friday', time_slot: '9:00 AM - 4:00 PM', location: 'Barangay Health Center - Maternal Room', slots_available: 25, bhw_in_charge: 'Midwife Elena Gomez', status: 'Active', barangay: 'Pianing', created_by: 'Nurse Maria Santos', created_at: '2026-08-20' },
    { id: 4, title: 'Family Planning & Responsible Parenthood', service_type: 'Family Planning', day_of_week: 'Monday to Friday', time_slot: '1:00 PM - 4:30 PM', location: 'Barangay Health Center - Counseling Office', slots_available: 20, bhw_in_charge: 'Nurse Maria Santos', status: 'Active', barangay: 'Pianing', created_by: 'Nurse Maria Santos', created_at: '2026-08-20' },
    { id: 5, title: 'General Medical & Senior Citizen Check-up', service_type: 'General Consultation', day_of_week: 'Every Monday', time_slot: '8:00 AM - 12:00 PM', location: 'Barangay Health Center - Consultation Room', slots_available: 30, bhw_in_charge: 'Municipal Health Officer & BHWs', status: 'Active', barangay: 'Pianing', created_by: 'Barangay Captain Juan Dela Cruz', created_at: '2026-08-20' }
  ],
  faq: [
    { topic: 'Clearance', keywords: ['clearance', 'requirement', 'document', 'how to request'], response: 'To request a Barangay Clearance, you need a valid Government ID, Cedula, and proof of residency in Zone 1-4. Note: Unverified resident accounts must be verified by Barangay Admin first.' },
    { topic: 'Hours', keywords: ['hours', 'open', 'schedule', 'time', 'health center', 'clinic'], response: 'The Barangay Health Center is open Monday to Friday, from 8:00 AM to 5:00 PM. Infant immunizations take place every Wednesday & Friday morning.' },
    { topic: 'Vaccine', keywords: ['vaccine', 'immunization', 'baby', 'infant', 'bcg', 'polio', 'mmr'], response: 'Free infant vaccines (BCG, Hepatitis B, DPT, Polio, MMR) are available. Please bring your Mother-Baby Handbook when visiting BHW clinic.' },
    { topic: 'Business Permit', keywords: ['business', 'permit', 'store', 'sari-sari'], response: 'Barangay Business Permit requirements: DTI Registration, Lease/Property title, and Owner Valid ID. Processing takes 1-2 business days.' }
  ]
};

// -------------------------------------------------------------
// Database Health & Connectivity Endpoint & Schema Migration
// -------------------------------------------------------------
// Safe column adder compatible with all MySQL and MariaDB versions
async function safeAddColumn(pool, tableName, columnName, columnDef) {
  try {
    const [cols] = await pool.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
      [tableName, columnName]
    );
    if (!cols || cols.length === 0) {
      await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDef}`);
    }
  } catch (e) {
    // ignore
  }
}

async function migrateDatabase() {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query("ALTER TABLE users ADD COLUMN rejection_reason TEXT NULL");
    } catch {}
    try {
      await pool.query("ALTER TABLE residents ADD COLUMN rejection_reason TEXT NULL");
    } catch {}
    try {
      await pool.query("ALTER TABLE document_requests DROP FOREIGN KEY document_requests_ibfk_1");
    } catch {}
    try {
      await pool.query("ALTER TABLE document_requests MODIFY COLUMN document_type VARCHAR(100) NOT NULL");
    } catch {}
    try {
      await pool.query("ALTER TABLE document_requests MODIFY COLUMN resident_id INT NULL DEFAULT 1");
    } catch {}
    try {
      await pool.query("ALTER TABLE residents MODIFY COLUMN household_id VARCHAR(50) NULL DEFAULT NULL");
    } catch {}
    try {
      await pool.query("UPDATE users SET phone = '09171234567' WHERE phone LIKE '%@%' OR phone = '' OR phone IS NULL");
    } catch {}

    // Safe column additions and modifications
    try {
      await pool.query("ALTER TABLE users MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Active'");
      await pool.query("ALTER TABLE users MODIFY COLUMN verification_status ENUM('Verified', 'Pending_Review', 'Rejected', 'Unverified', 'Pending') NOT NULL DEFAULT 'Pending_Review'");
      await pool.query("ALTER TABLE residents MODIFY COLUMN verification_status ENUM('Verified', 'Pending_Review', 'Rejected', 'Unverified', 'Pending') NOT NULL DEFAULT 'Pending_Review'");
      await pool.query("ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL");
    } catch {}

    await safeAddColumn(pool, 'document_requests', 'email', "VARCHAR(100) DEFAULT ''");
    await safeAddColumn(pool, 'document_requests', 'barangay', "VARCHAR(100) DEFAULT 'Pianing'");
    await safeAddColumn(pool, 'users', 'barangay', "VARCHAR(100) DEFAULT 'Pianing'");
    await safeAddColumn(pool, 'users', 'phone', "VARCHAR(50) DEFAULT ''");
    await safeAddColumn(pool, 'users', 'address', "VARCHAR(255) DEFAULT ''");
    await safeAddColumn(pool, 'users', 'last_login', "DATETIME NULL");
    await safeAddColumn(pool, 'residents', 'barangay', "VARCHAR(100) DEFAULT 'Pianing'");
    await safeAddColumn(pool, 'residents', 'first_name', "VARCHAR(50) NOT NULL DEFAULT ''");
    await safeAddColumn(pool, 'residents', 'middle_name', "VARCHAR(50) DEFAULT ''");
    await safeAddColumn(pool, 'residents', 'last_name', "VARCHAR(50) NOT NULL DEFAULT ''");
    await safeAddColumn(pool, 'residents', 'years_of_residency', "VARCHAR(50) DEFAULT NULL");

    // Messages table schema migration
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sender_name VARCHAR(100) NOT NULL,
          sender_role VARCHAR(50) NOT NULL,
          recipient_name VARCHAR(100) DEFAULT '',
          recipient_role VARCHAR(50) DEFAULT 'all',
          barangay VARCHAR(100) DEFAULT 'Pianing',
          message TEXT NOT NULL,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await safeAddColumn(pool, 'messages', 'recipient_name', "VARCHAR(100) DEFAULT ''");
      await safeAddColumn(pool, 'messages', 'barangay', "VARCHAR(100) DEFAULT 'Pianing'");
      await pool.query("ALTER TABLE messages MODIFY COLUMN recipient_role VARCHAR(100) DEFAULT 'all'");
    } catch {}

    // Document & Service Categories schema migration
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS document_categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          department VARCHAR(50) NOT NULL DEFAULT 'Barangay',
          description TEXT NULL,
          status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      const defaultCategories = [
        { name: 'Barangay Clearance', department: 'Barangay', description: 'Employment, bank requirement, loans & government IDs' },
        { name: 'Certificate of Residency', department: 'Barangay', description: 'Proof of bonafide residency for school, utility or bank' },
        { name: 'Certificate of Indigency', department: 'Barangay', description: 'For medical, educational, burial & DSWD financial assistance' },
        { name: 'Good Moral Clearance', department: 'Barangay', description: 'Official character clearance for PRC board exams & school' },
        { name: 'Business Clearance', department: 'Barangay', description: 'Barangay commercial permit for sari-sari stores & businesses' },
        { name: 'Business Retirement Certificate', department: 'Barangay', description: 'Official certification for closure or retirement of business' },
        { name: 'Certificate of Employment', department: 'Barangay', description: 'Barangay employment certificate & first time jobseeker aid' },
        { name: 'Certificate of Land Occupancy', department: 'Barangay', description: 'Proof of actual physical occupancy & lot possession' },
        { name: 'Barangay Activity Permit', department: 'Barangay', description: 'Permit for events, product sampling, promotions & gatherings' },
        { name: 'Medical Certificate', department: 'Health Center', description: 'Physician physical fitness and medical diagnosis' },
        { name: 'Health Clearance Certificate', department: 'Health Center', description: 'Sanitary and occupational health assessment' },
        { name: 'Immunization Card / Record', department: 'Health Center', description: 'Child infant immunization history' },
        { name: 'Maternal & Child Health Card', department: 'Health Center', description: 'Prenatal and postnatal pregnancy records' }
      ];

      for (const cat of defaultCategories) {
        await pool.query(
          "INSERT INTO document_categories (name, department, description, status) VALUES (?, ?, ?, 'Active') ON DUPLICATE KEY UPDATE department = VALUES(department), description = VALUES(description)",
          [cat.name, cat.department, cat.description]
        );
      }
    } catch (e) {
      console.warn('Category table migration warning:', e.message);
    }

    // Activity / Audit Logs schema migration
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_name VARCHAR(100) NOT NULL,
          user_role VARCHAR(50) NOT NULL,
          action VARCHAR(255) NOT NULL,
          action_type VARCHAR(50) DEFAULT 'General',
          barangay VARCHAR(100) DEFAULT 'Pianing',
          details TEXT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await safeAddColumn(pool, 'activity_logs', 'action_type', "VARCHAR(50) DEFAULT 'General'");
      await safeAddColumn(pool, 'activity_logs', 'barangay', "VARCHAR(100) DEFAULT 'Pianing'");
      await safeAddColumn(pool, 'activity_logs', 'details', "TEXT NULL");

      // Seed sample activity logs if table is empty
      const [existingLogs] = await pool.query("SELECT COUNT(*) as count FROM activity_logs");
      if (existingLogs && existingLogs[0]?.count === 0) {
        const seedLogs = [
          ['Super Admin Rodrigo Lim', 'superadmin', 'Configured Document Service Categories', 'Category', 'All (City-Wide)', 'Updated active status for Barangay Clearance and Good Moral Clearance'],
          ['Barangay Captain Juan Dela Cruz', 'admin', 'Approved Resident Registration', 'Resident', 'Pianing', 'Verified resident account for Juan Dela Cruz with valid Postal ID'],
          ['Barangay Clerk Ana Reyes', 'staff', 'Completed Barangay ID DOC-004', 'Document', 'Pianing', 'Issued official community ID card for Ana Reyes'],
          ['Nurse Maria Santos', 'bhw', 'Administered BCG Vaccine', 'Health', 'Pianing', 'Administered BCG Dose 1 to Baby Maria Santos at Health Center'],
          ['Super Admin Rodrigo Lim', 'superadmin', 'Created Barangay Administrator Account', 'User', 'Pianing', 'Generated administrative credentials for Captain Juan Dela Cruz'],
          ['Barangay Captain Juan Dela Cruz', 'admin', 'Processed Certificate of Residency DOC-002', 'Document', 'Pianing', 'Validated residency records for Maria Santos (Purok 2)'],
          ['Barangay Clerk Ana Reyes', 'staff', 'Broadcasted Health Alert SMS', 'System', 'Pianing', 'Sent SMS notification regarding upcoming immunization schedule to 45 registered parents'],
          ['Admin Roberto Garcia', 'admin', 'Approved Business Clearance DOC-003', 'Document', 'Anticala', 'Approved commercial permit for Pedro Garcia Sari-Sari Store'],
          ['Super Admin Rodrigo Lim', 'superadmin', 'System Security Audit Completed', 'Security', 'All (City-Wide)', 'Zero security anomalies detected across Pianing & Anticala nodes']
        ];
        for (const log of seedLogs) {
          await pool.query(
            "INSERT INTO activity_logs (user_name, user_role, action, action_type, barangay, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, NOW() - INTERVAL FLOOR(RAND()*72) HOUR)",
            log
          );
        }
      }
    } catch (e) {
      console.warn('Activity logs migration warning:', e.message);
    }

    // ─────────────────────────────────────────────────────────────
    // Health Center Appointments Table Migration
    // ─────────────────────────────────────────────────────────────
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS health_appointments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          appointment_code VARCHAR(50) NOT NULL UNIQUE,
          resident_id INT NULL,
          resident_name VARCHAR(100) NOT NULL,
          resident_phone VARCHAR(50) DEFAULT '',
          resident_email VARCHAR(100) DEFAULT '',
          barangay VARCHAR(100) DEFAULT 'Pianing',
          service_type VARCHAR(100) NOT NULL,
          preferred_date DATE NOT NULL,
          preferred_time VARCHAR(100) DEFAULT 'Morning (8:00 AM - 11:30 AM)',
          scheduled_date DATE NULL,
          scheduled_time VARCHAR(100) NULL,
          status ENUM('Pending', 'Approved', 'Completed', 'Cancelled', 'Rescheduled') DEFAULT 'Pending',
          bhw_notes TEXT NULL,
          resident_notes TEXT NULL,
          attending_bhw VARCHAR(100) DEFAULT '',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      await safeAddColumn(pool, 'health_appointments', 'resident_email', "VARCHAR(100) DEFAULT ''");
      await safeAddColumn(pool, 'health_appointments', 'barangay', "VARCHAR(100) DEFAULT 'Pianing'");
      await safeAddColumn(pool, 'health_appointments', 'bhw_notes', "TEXT NULL");
      await safeAddColumn(pool, 'health_appointments', 'resident_notes', "TEXT NULL");
      await safeAddColumn(pool, 'health_appointments', 'attending_bhw', "VARCHAR(100) DEFAULT ''");

      const [existingApts] = await pool.query("SELECT COUNT(*) as count FROM health_appointments");
      if (existingApts && existingApts[0]?.count === 0) {
        const seedApts = [
          ['APT-2026-001', 1, 'Juan Dela Cruz', '09171234567', 'resident@gmail.com', 'Pianing', 'Pre-Marriage Counseling (PMC)', '2026-09-02', 'Morning (8:00 AM - 11:30 AM)', '2026-09-02', '09:00 AM', 'Approved', 'Confirmed slot for couple counseling seminar. Please bring Certificate of No Marriage (CENOMAR) and valid IDs.', 'Applying for marriage license at Butuan City Hall.', 'Nurse Maria Santos'],
          ['APT-2026-002', 2, 'Maria Santos', '09182345678', 'maria.santos@gmail.com', 'Pianing', 'Prenatal Check-up', '2026-09-03', 'Morning (8:00 AM - 11:30 AM)', '2026-09-03', '10:00 AM', 'Approved', '3rd Trimester prenatal check-up scheduled.', 'Routine monthly checkup.', 'Nurse Maria Santos'],
          ['APT-2026-003', 5, 'Teresa Ramos', '09215678901', 'teresa.ramos@gmail.com', 'Pianing', 'Child Immunization', '2026-09-04', 'Afternoon (1:00 PM - 4:00 PM)', null, null, 'Pending', '', 'Hepatitis B 2nd dose for infant.', '']
        ];
        for (const apt of seedApts) {
          await pool.query(
            "INSERT INTO health_appointments (appointment_code, resident_id, resident_name, resident_phone, resident_email, barangay, service_type, preferred_date, preferred_time, scheduled_date, scheduled_time, status, bhw_notes, resident_notes, attending_bhw) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            apt
          );
        }
      }
    } catch (e) {
      console.warn('Health appointments migration warning:', e.message);
    }

    // ─────────────────────────────────────────────────────────────
    // Health Center Clinic Schedules Table Migration (Posted by BHW / Admin)
    // ─────────────────────────────────────────────────────────────
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS clinic_schedules (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(150) NOT NULL,
          service_type VARCHAR(100) NOT NULL,
          day_of_week VARCHAR(100) NOT NULL,
          time_slot VARCHAR(100) NOT NULL,
          location VARCHAR(150) DEFAULT 'Barangay Pianing Health Center',
          slots_available INT DEFAULT 20,
          bhw_in_charge VARCHAR(100) DEFAULT 'Nurse Maria Santos',
          status ENUM('Active', 'Suspended') DEFAULT 'Active',
          barangay VARCHAR(100) DEFAULT 'Pianing',
          created_by VARCHAR(100) DEFAULT 'BHW Maria',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      const [existingSchedules] = await pool.query("SELECT COUNT(*) as count FROM clinic_schedules");
      if (existingSchedules && existingSchedules[0]?.count === 0) {
        const seedSchedules = [
          ['Pre-Marriage Counseling (PMC) Seminar', 'Pre-Marriage Counseling (PMC)', 'Every Wednesday', '8:30 AM - 11:30 AM', 'Barangay Pianing Health Center - Conference Room', 15, 'Nurse Maria Santos & PopCom Officer', 'Active', 'Pianing', 'Nurse Maria Santos'],
          ['Expanded Child Immunization Day', 'Child Immunization', 'Every Thursday', '8:00 AM - 3:00 PM', 'Barangay Health Center - Immunization Ward', 40, 'Nurse Maria Santos', 'Active', 'Pianing', 'Nurse Maria Santos'],
          ['Maternal & Prenatal Care Clinic', 'Prenatal Check-up', 'Every Tuesday & Friday', '9:00 AM - 4:00 PM', 'Barangay Health Center - Maternal Room', 25, 'Midwife Elena Gomez', 'Active', 'Pianing', 'Nurse Maria Santos'],
          ['Family Planning & Responsible Parenthood', 'Family Planning', 'Monday to Friday', '1:00 PM - 4:30 PM', 'Barangay Health Center - Counseling Office', 20, 'Nurse Maria Santos', 'Active', 'Pianing', 'Nurse Maria Santos'],
          ['General Medical & Senior Citizen Check-up', 'General Consultation', 'Every Monday', '8:00 AM - 12:00 PM', 'Barangay Health Center - Consultation Room', 30, 'Municipal Health Officer & BHWs', 'Active', 'Pianing', 'Barangay Captain Juan Dela Cruz']
        ];
        for (const sch of seedSchedules) {
          await pool.query(
            "INSERT INTO clinic_schedules (title, service_type, day_of_week, time_slot, location, slots_available, bhw_in_charge, status, barangay, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            sch
          );
        }
      }
    } catch (e) {
      console.warn('Clinic schedules migration warning:', e.message);
    }
  }
}
setTimeout(migrateDatabase, 1000);

// Document & Service Category Management Endpoints
const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Barangay Clearance', department: 'Barangay', description: 'Employment, bank requirement, loans & government IDs', status: 'Active' },
  { id: 2, name: 'Certificate of Residency', department: 'Barangay', description: 'Proof of bonafide residency for school, utility or bank', status: 'Active' },
  { id: 3, name: 'Certificate of Indigency', department: 'Barangay', description: 'For medical, educational, burial & DSWD financial assistance', status: 'Active' },
  { id: 4, name: 'Good Moral Clearance', department: 'Barangay', description: 'Official character clearance for PRC board exams & school', status: 'Active' },
  { id: 5, name: 'Business Clearance', department: 'Barangay', description: 'Barangay commercial permit for sari-sari stores & businesses', status: 'Active' },
  { id: 6, name: 'Business Retirement Certificate', department: 'Barangay', description: 'Official certification for closure or retirement of business', status: 'Active' },
  { id: 7, name: 'Certificate of Employment', department: 'Barangay', description: 'Barangay employment certificate & first time jobseeker aid', status: 'Active' },
  { id: 8, name: 'Certificate of Land Occupancy', department: 'Barangay', description: 'Proof of actual physical occupancy & lot possession', status: 'Active' },
  { id: 9, name: 'Barangay Activity Permit', department: 'Barangay', description: 'Permit for events, product sampling, promotions & gatherings', status: 'Active' },
  { id: 10, name: 'Medical Certificate', department: 'Health Center', description: 'Physician physical fitness and medical diagnosis', status: 'Active' },
  { id: 11, name: 'Health Clearance Certificate', department: 'Health Center', description: 'Sanitary and occupational health assessment', status: 'Active' },
  { id: 12, name: 'Immunization Card / Record', department: 'Health Center', description: 'Child infant immunization history', status: 'Active' },
  { id: 13, name: 'Maternal & Child Health Card', department: 'Health Center', description: 'Prenatal and postnatal pregnancy records', status: 'Active' }
];
let inMemoryCategories = [...DEFAULT_CATEGORIES];

app.get('/api/categories', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query("SELECT * FROM document_categories ORDER BY department ASC, id ASC");
      if (rows && rows.length > 0) return res.json(rows);
    } catch (err) {
      console.warn('MySQL categories fetch error:', err.message);
    }
  }
  return res.json(inMemoryCategories);
});

app.put('/api/categories/:name', async (req, res) => {
  const { name } = req.params;
  const { status } = req.body;
  const cleanStatus = status === 'Inactive' ? 'Inactive' : 'Active';

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query(
        "UPDATE document_categories SET status = ? WHERE LOWER(name) = LOWER(?)",
        [cleanStatus, name]
      );
      return res.json({ success: true, message: `Category '${name}' is now ${cleanStatus}.` });
    } catch (err) {
      console.warn('MySQL category status update error:', err.message);
    }
  }

  const cat = inMemoryCategories.find(c => c.name.toLowerCase() === name.toLowerCase());
  if (cat) {
    cat.status = cleanStatus;
  }
  return res.json({ success: true, message: `Category '${name}' is now ${cleanStatus}.` });
});

// -------------------------------------------------------------
// Activity Logs & Audit Trail Endpoints & Logging Helper
// -------------------------------------------------------------
async function logActivity({ user_name, user_role, action, action_type = 'General', barangay = 'Pianing', details = '' }) {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query(
        "INSERT INTO activity_logs (user_name, user_role, action, action_type, barangay, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [user_name || 'System User', user_role || 'staff', action, action_type, barangay || 'Pianing', details || '']
      );
      return;
    } catch (err) {
      console.warn('MySQL logActivity error:', err.message);
    }
  }

  // in-memory fallback
  const newLog = {
    id: (mockData.logs && mockData.logs.length > 0 ? Math.max(...mockData.logs.map(l => l.id || 0)) : 0) + 1,
    user_name: user_name || 'System User',
    user_role: user_role || 'staff',
    action,
    action_type,
    barangay: barangay || 'Pianing',
    details: details || '',
    timestamp: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  };
  mockData.logs.unshift(newLog);
}

app.get('/api/activity-logs', async (req, res) => {
  const { barangay, action_type, search, role } = req.query;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      let query = "SELECT * FROM activity_logs WHERE 1=1";
      const params = [];
      if (barangay && barangay !== 'All' && barangay !== 'All (City-Wide)') {
        query += " AND (barangay = ? OR barangay = 'All (City-Wide)')";
        params.push(barangay);
      }
      if (action_type && action_type !== 'All') {
        query += " AND action_type = ?";
        params.push(action_type);
      }
      if (role && role !== 'All') {
        query += " AND LOWER(user_role) = LOWER(?)";
        params.push(role);
      }
      if (search) {
        query += " AND (user_name LIKE ? OR action LIKE ? OR details LIKE ?)";
        const s = `%${search}%`;
        params.push(s, s, s);
      }
      query += " ORDER BY id DESC LIMIT 200";
      const [rows] = await pool.query(query, params);
      return res.json(rows || []);
    } catch (err) {
      console.warn('MySQL fetch activity_logs error:', err.message);
    }
  }

  // in-memory fallback
  let logs = [...mockData.logs];
  if (barangay && barangay !== 'All' && barangay !== 'All (City-Wide)') {
    logs = logs.filter(l => !l.barangay || l.barangay === barangay || l.barangay === 'All (City-Wide)');
  }
  if (action_type && action_type !== 'All') {
    logs = logs.filter(l => l.action_type === action_type);
  }
  if (role && role !== 'All') {
    logs = logs.filter(l => l.user_role?.toLowerCase() === role.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    logs = logs.filter(l =>
      l.user_name?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.details?.toLowerCase().includes(q)
    );
  }
  return res.json(logs);
});

app.post('/api/activity-logs', async (req, res) => {
  const { user_name, user_role, action, action_type, barangay, details } = req.body;
  if (!action) return res.status(400).json({ success: false, message: 'Action description is required' });
  await logActivity({ user_name, user_role, action, action_type, barangay, details });
  return res.json({ success: true, message: 'Activity log recorded successfully' });
});

app.get('/api/db-status', async (req, res) => {
  const connResult = await testConnection();
  if (connResult.connected) await migrateDatabase();
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

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

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
  const searchEmails = emailAliases[cleanEmail] || [cleanEmail];

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      let [rows] = await pool.query(
        'SELECT * FROM users WHERE LOWER(TRIM(email)) IN (?) OR LOWER(TRIM(email)) = ?',
        [searchEmails, cleanEmail]
      );

      // Fallback: If not in users table yet, check if registered in residents table
      if (rows.length === 0) {
        const [resFind] = await pool.query(
          'SELECT * FROM residents WHERE LOWER(TRIM(email)) = ? LIMIT 1',
          [cleanEmail]
        );
        if (resFind.length > 0) {
          const r = resFind[0];
          const newHashed = await hashPassword(cleanPass || '123');
          await pool.query(
            "INSERT INTO users (name, email, password_hash, role, status, verification_status, barangay, phone, last_login) VALUES (?, ?, ?, 'resident', 'Active', ?, ?, ?, NOW())",
            [`${r.first_name} ${r.last_name}`, cleanEmail, newHashed, r.verification_status || 'Verified', r.barangay || 'Pianing', r.phone || '']
          );
          const [newRows] = await pool.query('SELECT * FROM users WHERE LOWER(TRIM(email)) = ? LIMIT 1', [cleanEmail]);
          rows = newRows;
        }
      }

      if (rows.length > 0) {
        const user = rows[0];
        const isMatch = await verifyPassword(cleanPass, user.password_hash);
        if (!isMatch) {
          return res.status(401).json({ success: false, message: 'Invalid password. Please check your credentials.' });
        }

        // Auto-upgrade legacy plain-text password to bcrypt hash
        if (user.password_hash && !user.password_hash.startsWith('$2a$') && !user.password_hash.startsWith('$2b$') && !user.password_hash.startsWith('$2y$')) {
          try {
            const newHash = await hashPassword(cleanPass);
            await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, user.id]);
          } catch {}
        }

        // Check if account is deactivated or archived
        if (user.status === 'Inactive') {
          return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact the Barangay Administrator.' });
        }
        if (user.status === 'Archived') {
          return res.status(403).json({ success: false, message: 'Your account has been archived. Please contact the Barangay Administrator.' });
        }

        await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        // Fetch phone, address, date_of_birth, age, civil_status, and live verification_status from residents table
        const [resRows] = await pool.query(
          'SELECT * FROM residents WHERE LOWER(email) = LOWER(?) OR CONCAT(LOWER(first_name), " ", LOWER(last_name)) = LOWER(?) LIMIT 1',
          [user.email, user.name || '']
        );
        if (resRows.length > 0) {
          user.phone = resRows[0].phone || '';
          user.address = resRows[0].address || '';
          user.first_name = resRows[0].first_name || '';
          user.middle_name = resRows[0].middle_name || '';
          user.last_name = resRows[0].last_name || '';
          
          let cleanDob = '';
          if (resRows[0].date_of_birth) {
            try {
              const d = new Date(resRows[0].date_of_birth);
              if (!isNaN(d.getTime())) {
                const yr = d.getFullYear();
                const mo = String(d.getMonth() + 1).padStart(2, '0');
                const da = String(d.getDate()).padStart(2, '0');
                cleanDob = `${yr}-${mo}-${da}`;
              }
            } catch {}
          }
          user.date_of_birth = cleanDob;
          user.civil_status = resRows[0].civil_status || 'Single';
          user.gender = resRows[0].gender || 'Male';
          user.age = cleanDob ? Math.floor((Date.now() - new Date(cleanDob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : '';
          user.years_of_residency = resRows[0].years_of_residency || '';
          // Strictly respect the live database status from residents table
          if (resRows[0].verification_status) {
            user.verification_status = resRows[0].verification_status;
          }
        }
        // Never expose password hash to client
        delete user.password_hash;
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
    const isMatch = await verifyPassword(password, user.password_hash || '123');
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password. Please check your credentials.' });
    }
    user.last_login = new Date().toLocaleString();
    // Merge phone from mockData residents
    const res_rec = mockData.residents.find(r => r.email && r.email.toLowerCase() === user.email.toLowerCase());
    if (res_rec) {
      user.phone = res_rec.phone || '';
      user.address = res_rec.address || '';
    }
    const safeUser = { ...user };
    delete safeUser.password_hash;
    return res.json({ success: true, user: safeUser, message: 'Login successful' });
  }

  return res.status(401).json({ success: false, message: 'No account found with that email address.' });
});

// Resident Account Registration
app.post('/api/auth/register', async (req, res) => {
  const { name, first_name, middle_name, last_name, date_of_birth, gender, civil_status, email, password, role, address, phone, submitted_id, years_of_residency } = req.body;
  
  const firstName = (first_name || (name ? name.trim().split(' ')[0] : '') || 'Resident').trim();
  const lastName = (last_name || (name ? name.trim().split(' ').slice(1).join(' ') : '') || 'Resident').trim();
  const middleName = (middle_name || '').trim();
  const fullName = name || `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
  const dob = date_of_birth || '2000-01-01';
  const userGender = gender || 'Male';
  const userCivilStatus = civil_status || 'Single';

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ success: false, message: 'First name, last name, and email are required.' });
  }

  const rawPassword = password || '123';
  const hashedPassword = await hashPassword(rawPassword);
  const userRole = role || 'resident';
  const residentAddress = address || 'Purok 1, Barangay Pianing, Butuan City';
  const userBarangay = req.body.barangay || (residentAddress.toLowerCase().includes('anticala') ? 'Anticala' : 'Pianing');

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      // 1. Insert into users table with bcrypt hashed password
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role, status, verification_status, barangay, phone, last_login) VALUES (?, ?, ?, ?, 'Active', 'Pending_Review', ?, ?, NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), verification_status = 'Pending_Review', barangay = VALUES(barangay)",
        [fullName, email.trim().toLowerCase(), hashedPassword, userRole, userBarangay, phone || '']
      );

      // 2. Insert into residents table with date_of_birth, gender, civil_status and barangay
      const [resResult] = await pool.query(
        "INSERT INTO residents (first_name, middle_name, last_name, date_of_birth, gender, civil_status, address, barangay, phone, email, verification_status, submitted_id, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending_Review', ?, NOW())",
        [firstName, middleName, lastName, dob, userGender, userCivilStatus, residentAddress, userBarangay, phone || '', email.trim().toLowerCase(), submitted_id || null]
      );

      // 3. If years_of_residency provided, save to column (add column if missing)
      if (years_of_residency && resResult.insertId) {
        try {
          await pool.query(
            "ALTER TABLE residents ADD COLUMN IF NOT EXISTS years_of_residency VARCHAR(50) DEFAULT NULL"
          );
        } catch {}
        try {
          await pool.query(
            "UPDATE residents SET years_of_residency = ? WHERE id = ?",
            [years_of_residency.trim(), resResult.insertId]
          );
        } catch {}
      }

      // 4. Ensure civil_status column exists (safe migration)
      try {
        await pool.query("ALTER TABLE residents ADD COLUMN IF NOT EXISTS civil_status VARCHAR(20) DEFAULT 'Single'");
      } catch {}

      return res.status(201).json({
        success: true,
        user: { id: resResult.insertId, name: fullName, first_name: firstName, middle_name: middleName, last_name: lastName, date_of_birth: dob, gender: userGender, civil_status: userCivilStatus, email, role: userRole, verification_status: 'Pending_Review', submitted_id, phone, address: residentAddress, barangay: userBarangay, years_of_residency: years_of_residency || '' },
        message: 'Account created! Your submitted ID is under review by the Barangay Admin.'
      });
    } catch (err) {
      console.warn('MySQL register error:', err.message);
    }
  }

  // Fallback: store in mockData
  const newPending = {
    id: Date.now(),
    name: fullName,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    date_of_birth: dob,
    email: email.toLowerCase(),
    phone: phone || '',
    address: residentAddress,
    barangay: userBarangay,
    household_id: 'HH-NEW',
    submitted_id: submitted_id || null,
    submitted_at: new Date().toLocaleString(),
    verification_status: 'Pending_Review'
  };
  mockData.pendingRegistrations.unshift(newPending);
  mockData.users.push({
    id: newPending.id,
    name: fullName,
    email: email.toLowerCase(),
    password_hash: hashedPassword,
    role: userRole,
    status: 'Active',
    barangay: userBarangay,
    verification_status: 'Pending_Review',
    last_login: new Date().toLocaleString()
  });
  mockData.residents.unshift({
    id: newPending.id,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    date_of_birth: dob,
    gender: 'Male',
    address: residentAddress,
    barangay: userBarangay,
    household_id: 'HH-NEW',
    phone: phone || '',
    email: email.toLowerCase(),
    verification_status: 'Pending_Review',
    submitted_id: submitted_id || null
  });

  res.status(201).json({
    success: true,
    user: { id: newPending.id, name: fullName, first_name: firstName, middle_name: middleName, last_name: lastName, date_of_birth: dob, email, role: userRole, verification_status: 'Pending_Review', submitted_id, phone, address: residentAddress, barangay: userBarangay },
    message: 'Account created! Your submitted ID is under review by the Barangay Admin.'
  });

});

// Check live verification status for resident
app.get('/api/auth/check-status', async (req, res) => {
  const email = (req.query.email || '').toLowerCase().trim();
  if (!email) return res.json({ verification_status: 'Pending_Review' });
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [rows] = await pool.query(
        "SELECT id, CONCAT(first_name, ' ', last_name) AS name, first_name, middle_name, last_name, date_of_birth, TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) as age, civil_status, gender, email, phone, address, barangay, verification_status, rejection_reason, submitted_id FROM residents WHERE LOWER(email) = LOWER(?) LIMIT 1",
        [email]
      );
      if (rows.length > 0) {
        const r = rows[0];
        if (r.date_of_birth) {
          try {
            const d = new Date(r.date_of_birth);
            if (!isNaN(d.getTime())) {
              const yr = d.getFullYear();
              const mo = String(d.getMonth() + 1).padStart(2, '0');
              const da = String(d.getDate()).padStart(2, '0');
              r.date_of_birth = `${yr}-${mo}-${da}`;
            }
          } catch {}
        }
        return res.json(r);
      }
      const [uRows] = await pool.query(
        "SELECT id, name, email, phone, barangay, verification_status, rejection_reason FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1",
        [email]
      );
      if (uRows.length > 0) {
        return res.json(uRows[0]);
      }
    } catch (err) {
      console.warn('check-status error:', err.message);
    }
  }
  const pending = mockData.pendingRegistrations.find(r => r.email && r.email.toLowerCase() === email);
  if (pending) return res.json(pending);
  const u = mockData.users.find(u => u.email && u.email.toLowerCase() === email);
  if (u) return res.json(u);
  res.json({ verification_status: 'Pending_Review' });
});

// GET pending resident registrations (for Admin approval)
app.get('/api/residents/pending', async (req, res) => {
  const { barangay } = req.query;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      let query = `
        SELECT 
          COALESCE(r.id, u.id) AS id,
          COALESCE(CONCAT(r.first_name, ' ', r.last_name), u.name) AS name,
          r.first_name,
          r.middle_name,
          r.last_name,
          r.date_of_birth,
          COALESCE(r.email, u.email) AS email,
          COALESCE(r.phone, u.phone) AS phone,
          COALESCE(r.address, CONCAT('Barangay ', COALESCE(u.barangay, 'Pianing'))) AS address,
          COALESCE(r.barangay, u.barangay, 'Pianing') AS barangay,
          r.household_id,
          r.submitted_id,
          COALESCE(r.submitted_at, u.created_at) AS submitted_at,
          COALESCE(r.verification_status, u.verification_status, 'Pending_Review') AS verification_status,
          COALESCE(r.rejection_reason, u.rejection_reason) AS rejection_reason
        FROM users u
        LEFT JOIN residents r ON LOWER(u.email) = LOWER(r.email)
        WHERE (u.role = 'resident' OR r.id IS NOT NULL)
          AND (
            LOWER(COALESCE(r.verification_status, u.verification_status, '')) NOT IN ('verified')
            OR COALESCE(r.verification_status, u.verification_status) IS NULL
          )
      `;
      const params = [];
      if (barangay && barangay.toLowerCase() !== 'all' && !barangay.toLowerCase().includes('city-wide')) {
        query += ` AND (LOWER(COALESCE(r.barangay, u.barangay, '')) = LOWER(?) OR LOWER(COALESCE(r.address, '')) LIKE LOWER(?))`;
        params.push(barangay.trim(), `%${barangay.trim()}%`);
      }
      query += ` ORDER BY u.id DESC`;
      const [rows] = await pool.query(query, params);
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL pending residents error:', err.message);
    }
  }
  let pending = mockData.pendingRegistrations.filter(r => r.verification_status !== 'Verified');
  if (barangay && barangay.toLowerCase() !== 'all' && !barangay.toLowerCase().includes('city-wide')) {
    pending = pending.filter(r => (r.barangay || r.address || '').toLowerCase().includes(barangay.toLowerCase()));
  }
  res.json(pending);
});

// Resubmit verification details & updated ID
app.put('/api/residents/resubmit', async (req, res) => {
  const { id, email, submitted_id, first_name, middle_name, last_name, address, phone } = req.body;
  if (!email && !id) {
    return res.status(400).json({ success: false, message: 'Resident email or ID is required.' });
  }

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const updates = [
        "verification_status = 'Pending_Review'",
        "rejection_reason = NULL"
      ];
      const params = [];
      if (submitted_id) { updates.push("submitted_id = ?"); params.push(submitted_id); }
      if (first_name) { updates.push("first_name = ?"); params.push(first_name); }
      if (middle_name !== undefined) { updates.push("middle_name = ?"); params.push(middle_name); }
      if (last_name) { updates.push("last_name = ?"); params.push(last_name); }
      if (address) { updates.push("address = ?"); params.push(address); }
      if (phone) { updates.push("phone = ?"); params.push(phone); }

      let clause = "id = ?";
      let clauseParam = id;
      if (!id && email) {
        clause = "LOWER(email) = LOWER(?)";
        clauseParam = email.trim();
      }
      params.push(clauseParam);

      await pool.query(`UPDATE residents SET ${updates.join(', ')} WHERE ${clause}`, params);

      // Also update users table verification_status
      if (email) {
        await pool.query("UPDATE users SET verification_status = 'Pending_Review', rejection_reason = NULL WHERE LOWER(email) = LOWER(?)", [email.trim()]);
      } else if (id) {
        const [rRows] = await pool.query("SELECT email FROM residents WHERE id = ?", [id]);
        if (rRows[0]?.email) {
          await pool.query("UPDATE users SET verification_status = 'Pending_Review', rejection_reason = NULL WHERE LOWER(email) = LOWER(?)", [rRows[0].email]);
        }
      }

      return res.json({
        success: true,
        message: 'Your verification details have been resubmitted successfully! The Barangay Admin will review your updated ID.'
      });
    } catch (err) {
      console.warn('MySQL resubmit error:', err.message);
    }
  }

  // Mock data fallback
  const pending = mockData.pendingRegistrations.find(r => (id && String(r.id) === String(id)) || (email && r.email.toLowerCase() === email.toLowerCase()));
  if (pending) {
    pending.verification_status = 'Pending_Review';
    pending.rejection_reason = null;
    if (submitted_id) pending.submitted_id = submitted_id;
    if (address) pending.address = address;
    if (phone) pending.phone = phone;
  }
  const u = mockData.users.find(u => (id && u.id === id) || (email && u.email.toLowerCase() === email.toLowerCase()));
  if (u) {
    u.verification_status = 'Pending_Review';
    u.rejection_reason = null;
  }
  res.json({
    success: true,
    message: 'Your verification details have been resubmitted successfully! The Barangay Admin will review your updated ID.'
  });
});

// Approve resident registration
app.put('/api/residents/:id/approve', async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      let targetEmail = null;
      let targetName = 'Resident';
      let targetPhone = '09171234567';

      // Check residents table first
      const [rRows] = await pool.query("SELECT first_name, last_name, email, phone FROM residents WHERE id = ?", [id]);
      if (rRows.length > 0) {
        targetEmail = rRows[0].email;
        targetName = `${rRows[0].first_name} ${rRows[0].last_name}`.trim();
        targetPhone = rRows[0].phone || targetPhone;
        await pool.query("UPDATE residents SET verification_status = 'Verified', rejection_reason = NULL WHERE id = ?", [id]);
      } else {
        // Fallback check users table
        const [uRows] = await pool.query("SELECT name, email, phone, barangay FROM users WHERE id = ?", [id]);
        if (uRows.length > 0) {
          targetEmail = uRows[0].email;
          targetName = uRows[0].name;
          targetPhone = uRows[0].phone || targetPhone;
        }
      }

      if (targetEmail) {
        await pool.query("UPDATE users SET verification_status = 'Verified', rejection_reason = NULL WHERE LOWER(email) = LOWER(?)", [targetEmail]);
        await pool.query("UPDATE residents SET verification_status = 'Verified', rejection_reason = NULL WHERE LOWER(email) = LOWER(?)", [targetEmail]);

        // If not in residents table, insert so records sync
        const [checkRes] = await pool.query("SELECT id FROM residents WHERE LOWER(email) = LOWER(?)", [targetEmail]);
        if (checkRes.length === 0) {
          const nameParts = targetName.split(' ');
          const fName = nameParts[0] || targetName;
          const lName = nameParts.slice(1).join(' ') || 'Resident';
          try {
            await pool.query(
              "INSERT INTO residents (first_name, last_name, email, phone, address, barangay, verification_status) VALUES (?, ?, ?, ?, 'Barangay Pianing', 'Pianing', 'Verified')",
              [fName, lName, targetEmail.toLowerCase(), targetPhone]
            );
          } catch {}
        }
      }

      // Auto-dispatch SMS notification via iProg Gateway
      try {
        const smsMsg = `Welcome ${targetName}! Your Barangay resident account application has been VERIFIED. You can now request clearances, business permits, and health services online.`;
        await pool.query(
          "INSERT INTO sms_notifications (recipient_name, recipient_phone, type, message, status) VALUES (?, ?, 'Account Verified', ?, 'Sent')",
          [targetName, targetPhone, smsMsg]
        );
        sendLiveSms(targetPhone, smsMsg).catch(e => console.warn('iProg SMS error:', e.message));
      } catch (smsErr) {
        console.warn('Auto SMS dispatch warning:', smsErr.message);
      }

      // Auto-dispatch matching Email notification
      if (targetEmail && targetEmail.includes('@')) {
        sendVerificationNoticeEmail({
          to: targetEmail,
          fullName: targetName,
          status: 'Verified',
        }).catch(e => console.warn('[Email] Verification approval error:', e.message));
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
    mockData.pendingRegistrations[idx].rejection_reason = null;
    const email = mockData.pendingRegistrations[idx].email;
    const u = mockData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (u) {
      u.verification_status = 'Verified';
      u.rejection_reason = null;
    }
    if (email) {
      sendVerificationNoticeEmail({
        to: email,
        fullName: mockData.pendingRegistrations[idx].first_name + ' ' + mockData.pendingRegistrations[idx].last_name,
        status: 'Verified',
      }).catch(() => {});
    }
  }
  const rIdx = mockData.residents.findIndex(r => String(r.id) === String(id));
  if (rIdx !== -1) {
    mockData.residents[rIdx].verification_status = 'Verified';
    mockData.residents[rIdx].rejection_reason = null;
  }
  res.json({ success: true, message: 'Resident account approved and verified successfully.' });
});

// Reject / Request Correction for resident registration (Wrong ID / Correction needed)
app.put('/api/residents/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason, remarks } = req.body || {};
  const rejectionCause = reason || remarks || 'Submitted Government ID or registration details require correction.';
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      let targetEmail = null;
      let targetPhone = null;
      let residentName = 'Resident';

      const [rows] = await pool.query("SELECT email, first_name, last_name, phone FROM residents WHERE id = ?", [id]);
      if (rows.length > 0) {
        targetEmail = rows[0].email;
        targetPhone = rows[0].phone;
        residentName = `${rows[0].first_name} ${rows[0].last_name}`.trim();
        await pool.query("UPDATE residents SET verification_status = 'Rejected', rejection_reason = ? WHERE id = ?", [rejectionCause, id]);
      } else {
        const [uRows] = await pool.query("SELECT name, email, phone FROM users WHERE id = ?", [id]);
        if (uRows.length > 0) {
          targetEmail = uRows[0].email;
          targetPhone = uRows[0].phone;
          residentName = uRows[0].name;
        }
      }

      if (targetEmail) {
        await pool.query("UPDATE users SET verification_status = 'Rejected', rejection_reason = ? WHERE LOWER(email) = LOWER(?)", [rejectionCause, targetEmail]);
        await pool.query("UPDATE residents SET verification_status = 'Rejected', rejection_reason = ? WHERE LOWER(email) = LOWER(?)", [rejectionCause, targetEmail]);
      }

      // Send SMS notice to resident explaining the correction required
      if (targetPhone) {
        try {
          const smsMsg = `Barangay Notice for ${residentName}: Your verification requires correction: "${rejectionCause}". Please log in to your resident portal to resubmit a clear ID photo.`;
          sendLiveSms(targetPhone, smsMsg).catch(e => console.warn('iProg SMS rejection notice error:', e.message));
          await pool.query(
            "INSERT INTO sms_notifications (recipient_name, recipient_phone, type, message, status) VALUES (?, ?, 'ID Correction Notice', ?, 'Sent')",
            [residentName, targetPhone, smsMsg]
          );
        } catch {}
      }

      // Send matching Email notice to resident with exact cause & fix steps
      if (targetEmail && targetEmail.includes('@')) {
        sendVerificationNoticeEmail({
          to: targetEmail,
          fullName: residentName,
          status: 'Rejected',
          reason: rejectionCause
        }).catch(e => console.warn('[Email] Verification rejection email error:', e.message));
      }

      return res.json({ success: true, message: 'Notice sent to resident. The resident can now resubmit a corrected ID on their portal.' });
    } catch (err) {
      console.warn('MySQL reject error:', err.message);
    }
  }
  const idx = mockData.pendingRegistrations.findIndex(r => String(r.id) === String(id));
  if (idx !== -1) {
    mockData.pendingRegistrations[idx].verification_status = 'Rejected';
    mockData.pendingRegistrations[idx].rejection_reason = rejectionCause;
    const email = mockData.pendingRegistrations[idx].email;
    const u = mockData.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (u) {
      u.verification_status = 'Rejected';
      u.rejection_reason = rejectionCause;
    }
    if (email) {
      sendVerificationNoticeEmail({
        to: email,
        fullName: mockData.pendingRegistrations[idx].first_name + ' ' + mockData.pendingRegistrations[idx].last_name,
        status: 'Rejected',
        reason: rejectionCause
      }).catch(() => {});
    }
  }
  const rIdx = mockData.residents.findIndex(r => String(r.id) === String(id));
  if (rIdx !== -1) {
    mockData.residents[rIdx].verification_status = 'Rejected';
    mockData.residents[rIdx].rejection_reason = rejectionCause;
  }
  res.json({ success: true, message: 'Notice sent to resident. The resident can now resubmit a corrected ID on their portal.' });
});

// Admin Delete / Purge Fake Account
app.delete('/api/residents/:id/purge', async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      let targetEmail = null;
      const [rows] = await pool.query("SELECT email FROM residents WHERE id = ?", [id]);
      if (rows.length > 0) {
        targetEmail = rows[0].email;
        await pool.query("DELETE FROM residents WHERE id = ?", [id]);
      } else {
        const [uRows] = await pool.query("SELECT email FROM users WHERE id = ?", [id]);
        if (uRows.length > 0) {
          targetEmail = uRows[0].email;
        }
      }

      if (targetEmail) {
        await pool.query("DELETE FROM users WHERE LOWER(email) = LOWER(?)", [targetEmail]);
        await pool.query("DELETE FROM residents WHERE LOWER(email) = LOWER(?)", [targetEmail]);
      } else {
        await pool.query("DELETE FROM users WHERE id = ?", [id]);
      }

      return res.json({ success: true, message: 'Registration record permanently purged.' });
    } catch (err) {
      console.warn('MySQL purge error:', err.message);
    }
  }
  mockData.pendingRegistrations = mockData.pendingRegistrations.filter(r => String(r.id) !== String(id));
  mockData.residents = mockData.residents.filter(r => String(r.id) !== String(id));
  res.json({ success: true, message: 'Registration record permanently purged.' });
});

// PUT /api/users/profile - Resident Profile Settings (phone, address, name, password, gender, civil_status)
app.put('/api/users/profile', async (req, res) => {
  const { id, email, password, phone, address, name, first_name, middle_name, last_name, date_of_birth, gender, civil_status } = req.body;
  const fullName = name || (first_name ? `${first_name} ${middle_name ? middle_name + ' ' : ''}${last_name || ''}`.trim() : undefined);
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      if (password) {
        const hashedPassword = await hashPassword(password);
        await pool.query("UPDATE users SET password_hash = ? WHERE id = ? OR LOWER(email) = LOWER(?)", [hashedPassword, id || 0, (email || '').toLowerCase()]);
      }
      if (fullName) {
        await pool.query("UPDATE users SET name = ? WHERE id = ? OR LOWER(email) = LOWER(?)", [fullName, id || 0, (email || '').toLowerCase()]);
      }
      // Update residents table
      const updates = [];
      const params = [];
      if (first_name) { updates.push('first_name = ?'); params.push(first_name); }
      if (middle_name !== undefined) { updates.push('middle_name = ?'); params.push(middle_name); }
      if (last_name) { updates.push('last_name = ?'); params.push(last_name); }
      if (date_of_birth) { updates.push('date_of_birth = ?'); params.push(date_of_birth); }
      if (gender) { updates.push('gender = ?'); params.push(gender); }
      if (civil_status) { updates.push('civil_status = ?'); params.push(civil_status); }
      if (phone) { updates.push('phone = ?'); params.push(phone); }
      if (address) { updates.push('address = ?'); params.push(address); }
      if (updates.length > 0) {
        params.push(id || 0, (email || '').toLowerCase(), (email || '').toLowerCase());
        await pool.query(`UPDATE residents SET ${updates.join(', ')} WHERE id = ? OR LOWER(email) = LOWER(?) OR email = ?`, params);
      }
      return res.json({ 
        success: true, 
        message: 'Profile settings updated successfully.',
        date_of_birth,
        gender,
        civil_status,
        age: date_of_birth ? Math.floor((Date.now() - new Date(date_of_birth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : undefined
      });
    } catch (err) {
      console.warn('MySQL update profile error:', err.message);
    }
  }

  // Mock data fallback
  const user = mockData.users.find(u => (id && u.id === id) || (email && u.email.toLowerCase() === email.toLowerCase()));
  if (user) {
    if (password) user.password_hash = password;
    if (fullName) user.name = fullName;
    if (date_of_birth) user.date_of_birth = date_of_birth;
  }
  const resident = mockData.residents.find(r => (id && r.id === id) || (email && r.email.toLowerCase() === email.toLowerCase()));
  if (resident) {
    if (first_name) resident.first_name = first_name;
    if (middle_name !== undefined) resident.middle_name = middle_name;
    if (last_name) resident.last_name = last_name;
    if (date_of_birth) resident.date_of_birth = date_of_birth;
    if (phone) resident.phone = phone;
    if (address) resident.address = address;
  }
  res.json({ success: true, message: 'Profile settings updated successfully.' });
});

// -------------------------------------------------------------
// System Users Management Endpoints (Super Admin & Staff Directory)
// -------------------------------------------------------------
app.get('/api/users', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      // Safe column check / addition
      await safeAddColumn(pool, 'users', 'barangay', "VARCHAR(100) DEFAULT 'Pianing'");
      await safeAddColumn(pool, 'users', 'phone', "VARCHAR(50) DEFAULT ''");
      await safeAddColumn(pool, 'users', 'last_login', "DATETIME NULL");
      await safeAddColumn(pool, 'users', 'status', "VARCHAR(50) DEFAULT 'Active'");
      await safeAddColumn(pool, 'users', 'verification_status', "VARCHAR(50) DEFAULT 'Verified'");

      const [rows] = await pool.query(`
        SELECT u.id, u.name, u.email, u.role, u.status, u.barangay, u.phone, u.last_login, u.created_at,
               COALESCE(r.verification_status, u.verification_status, 'Verified') AS verification_status
        FROM users u
        LEFT JOIN residents r ON LOWER(u.email) = LOWER(r.email)
        ORDER BY u.id ASC
      `);
      return res.json(rows || []);
    } catch (err) {
      console.warn('MySQL users fetch error:', err.message);
    }
  }
  // Exclude password_hash in fallback response
  const sanitized = (mockData.users || []).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status || 'Active',
    barangay: u.barangay || 'Pianing',
    phone: u.phone || '',
    last_login: u.last_login || null,
    created_at: u.created_at || new Date().toISOString(),
    verification_status: u.verification_status || 'Verified'
  }));
  return res.json(sanitized);
});

app.post('/api/users', async (req, res) => {
  const { name, email, password, role, barangay, phone, status } = req.body;
  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required.' });
  }

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [existing] = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
      }

      const rawPassword = password || '123';
      const hashedPassword = await hashPassword(rawPassword);
      const userRole = role || 'staff';
      const userBarangay = barangay || 'Pianing';
      const userStatus = status || 'Active';

      const [result] = await pool.query(
        "INSERT INTO users (name, email, password_hash, role, barangay, phone, status, verification_status, last_login) VALUES (?, ?, ?, ?, ?, ?, ?, 'Verified', NOW())",
        [name.trim(), email.trim().toLowerCase(), hashedPassword, userRole, userBarangay, phone || '', userStatus]
      );

      // If resident role, also insert into residents table
      if (userRole === 'resident') {
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || name.trim();
        const lastName = nameParts.slice(1).join(' ') || 'Resident';
        try {
          await pool.query(
            "INSERT INTO residents (first_name, last_name, email, phone, address, barangay, verification_status) VALUES (?, ?, ?, ?, ?, ?, 'Verified')",
            [firstName, lastName, email.trim().toLowerCase(), phone || '', `Barangay ${userBarangay}`, userBarangay]
          );
        } catch {}
      }

      const newUser = {
        id: result.insertId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: userRole,
        barangay: userBarangay,
        phone: phone || '',
        status: userStatus,
        last_login: new Date().toISOString(),
        verification_status: 'Verified'
      };

      return res.status(201).json(newUser);
    } catch (err) {
      console.warn('MySQL create user error:', err.message);
    }
  }

  // Fallback in-memory
  const newId = Date.now();
  const rawPassword = password || '123';
  const hashedPassword = await hashPassword(rawPassword);
  const newUser = {
    id: newId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password_hash: hashedPassword,
    role: role || 'staff',
    barangay: barangay || 'Pianing',
    phone: phone || '',
    status: status || 'Active',
    last_login: new Date().toISOString(),
    verification_status: 'Verified'
  };
  mockData.users.push(newUser);
  return res.status(201).json(newUser);
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role, barangay, phone, status, verification_status, password } = req.body;

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const updates = [];
      const params = [];
      if (name) { updates.push('name = ?'); params.push(name.trim()); }
      if (email) { updates.push('email = ?'); params.push(email.trim().toLowerCase()); }
      if (role) { updates.push('role = ?'); params.push(role); }
      if (barangay !== undefined) { updates.push('barangay = ?'); params.push(barangay); }
      if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
      if (status) { updates.push('status = ?'); params.push(status); }
      if (verification_status) { updates.push('verification_status = ?'); params.push(verification_status); }
      if (password) {
        const hashedPassword = await hashPassword(password);
        updates.push('password_hash = ?');
        params.push(hashedPassword);
      }

      if (updates.length > 0) {
        params.push(id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      // Sync verification_status or phone to residents table if applicable
      if (verification_status || phone || email) {
        const [uRows] = await pool.query("SELECT email FROM users WHERE id = ?", [id]);
        const targetEmail = email || uRows[0]?.email;
        if (targetEmail) {
          const resUpdates = [];
          const resParams = [];
          if (verification_status) { resUpdates.push('verification_status = ?'); resParams.push(verification_status); }
          if (phone) { resUpdates.push('phone = ?'); resParams.push(phone); }
          if (resUpdates.length > 0) {
            resParams.push(targetEmail.toLowerCase());
            await pool.query(`UPDATE residents SET ${resUpdates.join(', ')} WHERE LOWER(email) = LOWER(?)`, resParams);
          }
        }
      }

      return res.json({ success: true, message: 'User updated successfully.' });
    } catch (err) {
      console.warn('MySQL update user error:', err.message);
    }
  }

  // Mock data fallback
  const user = mockData.users.find(u => String(u.id) === String(id));
  if (user) {
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (barangay !== undefined) user.barangay = barangay;
    if (phone !== undefined) user.phone = phone;
    if (status) user.status = status;
    if (verification_status) user.verification_status = verification_status;
    if (password) user.password_hash = password;
  }
  return res.json({ success: true, message: 'User updated successfully.' });
});

app.post('/api/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  const resetPass = newPassword || '123';

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const hashedReset = await hashPassword(resetPass);
      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [hashedReset, id]);
      return res.json({ success: true, message: `Password reset to '${resetPass}' successfully.` });
    } catch (err) {
      console.warn('MySQL reset password error:', err.message);
    }
  }

  const user = mockData.users.find(u => String(u.id) === String(id));
  if (user) {
    user.password_hash = resetPass;
  }
  return res.json({ success: true, message: `Password reset to '${resetPass}' successfully.` });
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      // Soft-archive instead of hard-delete to preserve history
      await pool.query("UPDATE users SET status = 'Archived' WHERE id = ?", [id]);
      return res.json({ success: true, message: 'User account archived successfully.' });
    } catch (err) {
      console.warn('MySQL delete user error:', err.message);
    }
  }

  const u = mockData.users.find(u => String(u.id) === String(id));
  if (u) {
    u.status = 'Archived';
  }
  return res.json({ success: true, message: 'User account archived successfully.' });
});

// Intra-System Messenger Endpoints (Staff Chat)
app.get('/api/messages', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      // Ensure messages table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sender_name VARCHAR(100) DEFAULT 'Staff',
          sender_role VARCHAR(50) DEFAULT 'staff',
          recipient_name VARCHAR(100) DEFAULT '',
          recipient_role VARCHAR(50) DEFAULT 'all',
          barangay VARCHAR(100) DEFAULT 'Pianing',
          message TEXT,
          sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const [rows] = await pool.query("SELECT * FROM messages ORDER BY id ASC");
      return res.json(rows || []);
    } catch (err) {
      console.warn('MySQL messages fetch error:', err.message);
    }
  }
  return res.json(mockData.messages || []);
});

app.post('/api/messages', async (req, res) => {
  const { sender_name, sender_role, recipient_name, recipient_role, message, barangay } = req.body;
  const targetRecipientName = recipient_name || '';
  const targetRecipientRole = recipient_role || 'all';
  let targetBarangay = barangay || 'Pianing';

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      // Look up barangay from users table if not passed
      if (!barangay && (sender_name || recipient_name)) {
        try {
          const [uRows] = await pool.query(
            "SELECT barangay FROM users WHERE LOWER(name) = LOWER(?) OR LOWER(name) = LOWER(?) LIMIT 1",
            [sender_name || '', recipient_name || '']
          );
          if (uRows.length > 0 && uRows[0].barangay) targetBarangay = uRows[0].barangay;
        } catch {}
      }

      const [result] = await pool.query(
        "INSERT INTO messages (sender_name, sender_role, recipient_name, recipient_role, barangay, message) VALUES (?, ?, ?, ?, ?, ?)",
        [sender_name || 'Staff', sender_role || 'staff', targetRecipientName, targetRecipientRole, targetBarangay, message || '']
      );
      return res.status(201).json({
        id: result.insertId,
        sender_name: sender_name || 'Staff',
        sender_role: sender_role || 'staff',
        recipient_name: targetRecipientName,
        recipient_role: targetRecipientRole,
        barangay: targetBarangay,
        message: message || '',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn('MySQL message insert error:', err.message);
    }
  }

  // Fallback to mockData
  const newMsg = {
    id: Date.now(),
    sender_name: sender_name || 'Staff',
    sender_role: sender_role || 'staff',
    recipient_name: targetRecipientName,
    recipient_role: targetRecipientRole,
    barangay: targetBarangay,
    message: message || '',
    timestamp: new Date().toISOString()
  };
  mockData.messages.push(newMsg);
  return res.status(201).json(newMsg);
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
      let userRows = [];
      let resRows = [];
      try {
        const [u] = await pool.query('SELECT * FROM users WHERE LOWER(email) = ?', [email]);
        userRows = u;
      } catch (e) {
        console.warn('user query fallback in check-status:', e.message);
      }
      try {
        const [r] = await pool.query('SELECT * FROM residents WHERE LOWER(email) = LOWER(?) LIMIT 1', [email]);
        resRows = r;
      } catch (e) {
        console.warn('resident query fallback in check-status:', e.message);
      }

      if (userRows.length > 0 || resRows.length > 0) {
        const user = userRows[0] || { id: resRows[0]?.id || 1, email, role: 'resident', name: `${resRows[0]?.first_name || 'Resident'} ${resRows[0]?.last_name || ''}`.trim() };
        
        // If either residents table OR users table is Verified, sync both and report Verified
        let effectiveStatus = user.verification_status || 'Pending_Review';
        let rejectionCause = user.rejection_reason || '';

        if (resRows.length > 0) {
          user.phone = resRows[0].phone || '';
          user.address = resRows[0].address || '';
          user.first_name = resRows[0].first_name || '';
          user.middle_name = resRows[0].middle_name || '';
          user.last_name = resRows[0].last_name || '';
          rejectionCause = resRows[0].resident_rejection_reason || user.rejection_reason || '';

          if (resRows[0].resident_ver_status === 'Verified' || effectiveStatus === 'Verified') {
            effectiveStatus = 'Verified';
            try {
              await pool.query("UPDATE users SET verification_status = 'Verified' WHERE LOWER(email) = LOWER(?)", [email]);
              await pool.query("UPDATE residents SET verification_status = 'Verified' WHERE LOWER(email) = LOWER(?)", [email]);
            } catch {}
          } else if (resRows[0].resident_ver_status === 'Rejected' || effectiveStatus === 'Rejected') {
            effectiveStatus = 'Rejected';
          }
        }
        user.verification_status = effectiveStatus;
        user.rejection_reason = rejectionCause;
        return res.json({ success: true, user });
      }
    } catch (err) {
      console.warn('check-status error:', err.message);
    }
  }

  // Fallback: check mockData
  const user = mockData.users.find(u => u.email.toLowerCase() === email);
  const res_rec = mockData.residents.find(r => r.email && r.email.toLowerCase() === email);
  if (user || res_rec) {
    const combined = user || { id: res_rec.id, email, role: 'resident', name: `${res_rec.first_name} ${res_rec.last_name}` };
    if (res_rec) {
      combined.phone = res_rec.phone || '';
      combined.address = res_rec.address || '';
      if (res_rec.verification_status === 'Verified' || combined.verification_status === 'Verified') {
        combined.verification_status = 'Verified';
        if (user) user.verification_status = 'Verified';
        res_rec.verification_status = 'Verified';
      }
    }
    return res.json({ success: true, user: combined });
  }
  res.status(404).json({ success: false, message: 'User not found.' });
});

// -------------------------------------------------------------
// Statistics Endpoints
// -------------------------------------------------------------
app.get('/api/stats/admin', async (req, res) => {
  const { barangay } = req.query;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      let docWhere = "";
      let resWhere = "";
      const params = [];
      if (barangay && barangay.toLowerCase() !== 'all' && !barangay.toLowerCase().includes('city-wide')) {
        docWhere = " AND (LOWER(barangay) = LOWER(?) OR resident_name LIKE ?)";
        resWhere = " WHERE (LOWER(barangay) = LOWER(?) OR LOWER(address) LIKE ?)";
        params.push(barangay.trim(), `%${barangay.trim()}%`);
      }

      const [[pendingDocs]] = await pool.query(`SELECT COUNT(*) as count FROM document_requests WHERE status = 'Pending'${docWhere}`, params);
      const [[processedDocs]] = await pool.query(`SELECT COUNT(*) as count FROM document_requests WHERE status = 'Completed' AND DATE(processed_at) = CURDATE()${docWhere}`, params);
      const [[totalResidents]] = await pool.query(`SELECT COUNT(*) as count FROM residents${resWhere}`, resWhere ? [barangay.trim(), `%${barangay.trim()}%`] : []);
      const [[activeRecords]] = await pool.query(`SELECT COUNT(*) as count FROM document_requests WHERE 1=1${docWhere}`, params);
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

  let docs = mockData.documents;
  let resList = mockData.residents;
  if (barangay && barangay.toLowerCase() !== 'all' && !barangay.toLowerCase().includes('city-wide')) {
    docs = docs.filter(d => (d.barangay || '').toLowerCase() === barangay.toLowerCase());
    resList = resList.filter(r => (r.barangay || r.address || '').toLowerCase().includes(barangay.toLowerCase()));
  }

  res.json({
    pendingDocs: docs.filter(d => d.status === 'Pending').length,
    processedToday: docs.filter(d => d.status === 'Completed').length,
    totalResidents: resList.length,
    activeRecords: docs.length
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
  const { barangay } = req.query;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      try {
        await pool.query("ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS extra_fields TEXT NULL");
      } catch {}
      let query = `
        SELECT d.*, 
               COALESCE(r.address, '') AS resident_address,
               COALESCE(r.civil_status, 'Single') AS resident_civil_status,
               COALESCE(r.gender, '') AS resident_gender,
               r.date_of_birth AS resident_birth_date,
               TIMESTAMPDIFF(YEAR, r.date_of_birth, CURDATE()) AS resident_age
        FROM document_requests d
        LEFT JOIN residents r ON (d.resident_id = r.id OR (d.email != '' AND LOWER(d.email) = LOWER(r.email)))
      `;
      const params = [];
      if (barangay && barangay.toLowerCase() !== 'all' && !barangay.toLowerCase().includes('city-wide')) {
        query += ` WHERE (LOWER(d.barangay) = LOWER(?) OR LOWER(COALESCE(r.barangay, '')) = LOWER(?) OR LOWER(COALESCE(r.address, '')) LIKE LOWER(?))`;
        params.push(barangay.trim(), barangay.trim(), `%${barangay.trim()}%`);
      }
      query += ` ORDER BY d.id DESC`;
      const [rows] = await pool.query(query, params);
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL documents fetch error:', err.message);
    }
  }
  let docs = mockData.documents;
  if (barangay && barangay.toLowerCase() !== 'all' && !barangay.toLowerCase().includes('city-wide')) {
    docs = docs.filter(d => (d.barangay || '').toLowerCase() === barangay.toLowerCase());
  }
  res.json(docs);
});

app.post('/api/documents', async (req, res) => {
  const { resident_name, resident_id, email, document_type, purpose, barangay, extra_fields } = req.body;
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const requestCode = `DOC-${Date.now().toString().slice(-4)}${randNum}`;
  let docBarangay = barangay || 'Pianing';
  
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      try {
        await pool.query("ALTER TABLE document_requests MODIFY COLUMN document_type VARCHAR(100) NOT NULL");
        await pool.query("ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS email VARCHAR(100) DEFAULT ''");
        await pool.query("ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS barangay VARCHAR(100) DEFAULT 'Pianing'");
        await pool.query("ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS extra_fields TEXT NULL");
      } catch {}

      // Check if this document category is deactivated by Super Admin
      try {
        const [catRows] = await pool.query("SELECT status FROM document_categories WHERE LOWER(name) = LOWER(?) LIMIT 1", [document_type]);
        if (catRows.length > 0 && catRows[0].status === 'Inactive') {
          return res.status(400).json({
            success: false,
            message: `The '${document_type}' service category has been temporarily deactivated by the Super Administrator.`
          });
        }
      } catch {}

      let matchedResidentId = resident_id || 1;
      let residentAddress = '';
      let residentCivilStatus = 'Single';
      if (resident_id || resident_name || email) {
        try {
          const [resRows] = await pool.query(
            "SELECT id, address, civil_status FROM residents WHERE id = ? OR LOWER(email) = LOWER(?) OR CONCAT(LOWER(first_name), ' ', LOWER(last_name)) = LOWER(?) LIMIT 1",
            [resident_id || 0, email || '', resident_name || '']
          );
          if (resRows.length > 0) {
            matchedResidentId = resRows[0].id;
            residentAddress = resRows[0].address || '';
            residentCivilStatus = resRows[0].civil_status || 'Single';
            if (resRows[0].address && resRows[0].address.toLowerCase().includes('anticala')) {
              docBarangay = 'Anticala';
            }
          }
        } catch {}
      }

      const docStatus = req.body.status || 'Pending';
      const processedBy = req.body.processed_by || (docStatus === 'Completed' ? 'Barangay Administrator' : null);
      const processedAt = docStatus === 'Completed' ? new Date().toISOString() : null;

      try {
        await pool.query("ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS processed_by VARCHAR(100) NULL");
        await pool.query("ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS processed_at DATETIME NULL");
      } catch {}

      const [result] = await pool.query(
        "INSERT INTO document_requests (request_code, resident_id, resident_name, email, document_type, purpose, status, barangay, extra_fields, processed_by, processed_at, requested_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
        [requestCode, matchedResidentId, resident_name || 'Resident', email || '', document_type, purpose || 'Personal Requirement', docStatus, docBarangay, extraFieldsStr, processedBy, docStatus === 'Completed' ? new Date() : null]
      );
      const newDoc = {
        id: result.insertId,
        request_code: requestCode,
        resident_id: matchedResidentId,
        resident_name: resident_name || 'Resident',
        email: email || '',
        barangay: docBarangay,
        document_type,
        purpose: purpose || 'Personal Requirement',
        extra_fields: extraFieldsStr,
        resident_address: residentAddress,
        resident_civil_status: residentCivilStatus,
        status: docStatus,
        processed_by: processedBy,
        processed_at: processedAt,
        requested_at: new Date().toISOString()
      };
      return res.status(201).json(newDoc);
    } catch (err) {
      console.warn('MySQL document insert error:', err.message);
    }
  }

  const docStatus = req.body.status || 'Pending';
  const processedBy = req.body.processed_by || (docStatus === 'Completed' ? 'Barangay Administrator' : null);
  const newDoc = {
    id: Date.now(),
    request_code: requestCode,
    resident_id: resident_id || 1,
    resident_name: resident_name || 'Resident',
    email: email || '',
    barangay: docBarangay,
    document_type,
    purpose: purpose || 'Personal Requirement',
    extra_fields: typeof extra_fields === 'object' ? JSON.stringify(extra_fields) : (extra_fields || null),
    status: docStatus,
    processed_by: processedBy,
    processed_at: docStatus === 'Completed' ? new Date().toISOString() : null,
    requested_at: new Date().toISOString()
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
          let alertType = 'Document Update';

          if (status === 'Ready for Pickup') {
            smsMsg = `Good day ${recipientName}! Your requested ${docData.document_type} (Ref: ${docData.request_code}) has been SIGNED and is now READY FOR PICKUP at the Barangay Hall. Please bring a valid ID and your reference number. Office hours: Monday-Friday, 8AM-5PM.`;
            alertType = 'Document Ready';
          } else if (status === 'Completed') {
            smsMsg = `Good day ${recipientName}! Your ${docData.document_type} (Ref: ${docData.request_code}) has been marked as CLAIMED. Thank you for visiting the Barangay Hall.`;
            alertType = 'Document Completed';
          } else if (status === 'Processing') {
            smsMsg = `Good day ${recipientName}! Your requested ${docData.document_type} (Ref: ${docData.request_code}) is now being PROCESSED by ${processed_by || 'Barangay Staff'}. You will receive another text once ready for pickup.`;
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

          // Auto-dispatch Email notification if resident has an email on file
          const residentEmail = docData.email || null;
          if (residentEmail && residentEmail.includes('@')) {
            sendDocumentStatusEmail({
              to: residentEmail,
              recipientName,
              documentType: docData.document_type,
              requestCode:  docData.request_code,
              status,
            }).catch(e => console.warn('[Email] Document email error:', e.message));
            console.log(`[Auto-Email] Document status email sent to ${residentEmail}`);
          } else {
            // Try to look up email from residents table
            try {
              const [emailRows] = await pool.query("SELECT email FROM residents WHERE id = ? OR CONCAT(first_name,' ',last_name) LIKE ?", [docData.resident_id, `%${docData.resident_name}%`]);
              const foundEmail = emailRows[0]?.email;
              if (foundEmail && foundEmail.includes('@')) {
                sendDocumentStatusEmail({
                  to: foundEmail,
                  recipientName,
                  documentType: docData.document_type,
                  requestCode:  docData.request_code,
                  status,
                }).catch(e => console.warn('[Email] Document email error:', e.message));
                console.log(`[Auto-Email] Document status email sent to ${foundEmail}`);
              }
            } catch (emailLookupErr) { /* no email found, skip */ }
          }
        } catch (smsErr) {
          console.warn('Auto SMS/Email dispatch warning:', smsErr.message);
        }
      }

      return res.json({ success: true, message: 'Document request updated. Auto SMS & email sent to resident.' });
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
  const { barangay } = req.query;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await safeAddColumn(pool, 'residents', 'civil_status', "VARCHAR(50) DEFAULT 'Single'");
      await safeAddColumn(pool, 'residents', 'barangay', "VARCHAR(100) DEFAULT 'Pianing'");
      await safeAddColumn(pool, 'residents', 'purok', "VARCHAR(50) DEFAULT '1'");
      await safeAddColumn(pool, 'residents', 'date_of_birth', "DATE NULL");

      let query = `
        SELECT r.*,
               TIMESTAMPDIFF(YEAR, r.date_of_birth, CURDATE()) AS age
        FROM residents r 
      `;
      const params = [];
      if (barangay && barangay.toLowerCase() !== 'all' && !barangay.toLowerCase().includes('city-wide')) {
        query += ` WHERE (LOWER(r.barangay) = LOWER(?) OR LOWER(r.address) LIKE LOWER(?))`;
        params.push(barangay.trim(), `%${barangay.trim()}%`);
      }
      query += ` ORDER BY r.id DESC`;
      const [rows] = await pool.query(query, params);
      
      const parsedRows = (rows || []).map(r => {
        let p = r.purok;
        if (!p && r.address) {
          const match = r.address.match(/purok\s*([0-9A-Za-z_-]+)/i);
          if (match) p = match[1];
        }
        return {
          ...r,
          purok: p || '1',
          barangay: r.barangay || (r.address && r.address.toLowerCase().includes('anticala') ? 'Anticala' : 'Pianing'),
          civil_status: r.civil_status || 'Single'
        };
      });

      return res.json(parsedRows);
    } catch (err) {
      console.warn('MySQL residents fetch error:', err.message);
    }
  }
  let fallback = (mockData.residents || []).map(r => {
    let p = r.purok;
    if (!p && r.address) {
      const match = r.address.match(/purok\s*([0-9A-Za-z_-]+)/i);
      if (match) p = match[1];
    }
    return {
      ...r,
      purok: p || '1',
      barangay: r.barangay || 'Pianing',
      civil_status: r.civil_status || 'Single',
      age: r.age || 25
    };
  });
  if (barangay && barangay.toLowerCase() !== 'all' && !barangay.toLowerCase().includes('city-wide')) {
    fallback = fallback.filter(r => (r.barangay || r.address || '').toLowerCase().includes(barangay.toLowerCase()));
  }
  res.json(fallback);
});

app.post('/api/residents', async (req, res) => {
  const { first_name, middle_name, last_name, date_of_birth, gender, civil_status, address, household_id, phone, email, password } = req.body;
  const rawPassword = password || '123';
  const cleanFirst = (first_name || '').trim();
  const cleanLast = (last_name || '').trim();
  const cleanMiddle = (middle_name || '').trim();
  const fullName = `${cleanFirst} ${cleanMiddle ? cleanMiddle + ' ' : ''}${cleanLast}`.trim();
  const residentEmail = (email || `${cleanFirst.toLowerCase()}.${cleanLast.toLowerCase().replace(/\s+/g, '')}@resident.local`).toLowerCase().trim();
  const residentAddress = address || 'Purok 1, Barangay Pianing, Butuan City';
  const residentBarangay = residentAddress.toLowerCase().includes('anticala') ? 'Anticala' : 'Pianing';

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const hashedPassword = await hashPassword(rawPassword);
      // 1. Insert/update user login record with proper barangay
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role, status, verification_status, barangay, phone, last_login) VALUES (?, ?, ?, 'resident', 'Active', 'Verified', ?, ?, NOW()) ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), verification_status = 'Verified', barangay = VALUES(barangay)",
        [fullName, residentEmail, hashedPassword, residentBarangay, phone || '']
      );

      // 2. Insert into residents table
      const [result] = await pool.query(
        "INSERT INTO residents (first_name, middle_name, last_name, date_of_birth, gender, civil_status, address, barangay, household_id, phone, email, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Verified')",
        [cleanFirst, cleanMiddle, cleanLast, date_of_birth || '2000-01-01', gender || 'Male', civil_status || 'Single', residentAddress, residentBarangay, household_id || null, phone || '', residentEmail]
      );

      return res.status(201).json({ id: result.insertId, ...req.body, address: residentAddress, barangay: residentBarangay, email: residentEmail });
    } catch (err) {
      console.warn('MySQL resident insert error:', err.message);
    }
  }

  const newRes = {
    id: mockData.residents.length + 1,
    first_name: cleanFirst,
    middle_name: cleanMiddle,
    last_name: cleanLast,
    date_of_birth: date_of_birth || '2000-01-01',
    gender: gender || 'Male',
    civil_status: civil_status || 'Single',
    address: residentAddress,
    barangay: residentBarangay,
    phone: phone || '',
    email: residentEmail,
    verification_status: 'Verified'
  };
  mockData.residents.unshift(newRes);
  mockData.users.push({
    id: Date.now(),
    name: fullName,
    email: residentEmail,
    password_hash: rawPassword,
    role: 'resident',
    status: 'Active',
    barangay: residentBarangay,
    verification_status: 'Verified',
    phone: phone || ''
  });
  res.status(201).json(newRes);
});


// -------------------------------------------------------------
// System Users CRUD
// -------------------------------------------------------------
app.get('/api/users', async (req, res) => {
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      // Full user directory — includes all roles including residents
      const [rows] = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.status, u.barangay, u.phone, u.last_login, u.created_at, u.verification_status,
                r.first_name, r.last_name, r.middle_name, r.address, r.date_of_birth
         FROM users u
         LEFT JOIN residents r ON LOWER(u.email) = LOWER(r.email)
         ORDER BY u.id DESC`
      );
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL users fetch error:', err.message);
    }
  }
  // Return all users from mockData
  const allUsers = [
    ...mockData.users,
    ...mockData.residents
      .filter(r => !mockData.users.some(u => u.email.toLowerCase() === (r.email || '').toLowerCase()))
      .map(r => ({
        id: r.id + 1000,
        name: `${r.first_name} ${r.last_name}`.trim(),
        email: r.email || '',
        role: 'resident',
        status: 'Active',
        barangay: r.barangay || 'Pianing',
        phone: r.phone || '',
        last_login: r.last_login || 'Never',
        verification_status: r.verification_status || 'Verified'
      }))
  ];
  res.json(allUsers);
});

app.post('/api/users', async (req, res) => {
  const { name, email, password, role, status, barangay, phone } = req.body;
  if (!name || !email || !role) {
    return res.status(400).json({ success: false, message: 'Name, email, and role are required.' });
  }

  const rawPassword = password || '123';
  const userBarangay = barangay || 'Pianing';
  const userPhone = phone || '';

  const pool = getPool();

  // 1 Admin per Barangay rule check
  if (role === 'admin') {
    if (pool && getStatus().connected) {
      try {
        const [existingAdmins] = await pool.query(
          "SELECT id, name FROM users WHERE role = 'admin' AND status = 'Active' AND LOWER(barangay) = LOWER(?)",
          [userBarangay.trim()]
        );
        if (existingAdmins.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Barangay ${userBarangay} already has an active Administrator (${existingAdmins[0].name}). Only 1 Admin per Barangay is allowed.`
          });
        }
      } catch {}
    } else {
      const existing = (mockData.users || []).find(u => u.role === 'admin' && u.status === 'Active' && (u.barangay || 'Pianing').toLowerCase() === userBarangay.toLowerCase());
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Barangay ${userBarangay} already has an active Administrator (${existing.name}). Only 1 Admin per Barangay is allowed.`
        });
      }
    }
  }

  if (pool && getStatus().connected) {
    try {
      try {
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS barangay VARCHAR(100) DEFAULT 'Pianing'");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT ''");
      } catch {}

      const [result] = await pool.query(
        "INSERT INTO users (name, email, password_hash, role, status, barangay, phone) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), barangay = VALUES(barangay), phone = VALUES(phone)",
        [name.trim(), email.toLowerCase().trim(), rawPassword, role, status || 'Active', userBarangay, userPhone]
      );
      return res.status(201).json({
        id: result.insertId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role,
        status: status || 'Active',
        barangay: userBarangay,
        phone: userPhone,
        last_login: 'Never'
      });
    } catch (err) {
      console.warn('MySQL user insert error:', err.message);
    }
  }

  const newUser = {
    id: mockData.users.length + 1,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password_hash: rawPassword,
    role,
    status: status || 'Active',
    barangay: userBarangay,
    phone: userPhone,
    last_login: 'Never'
  };
  mockData.users.unshift(newUser);
  res.status(201).json(newUser);
});

app.put('/api/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { name, email, role, status, barangay, phone, password } = req.body;
  const userBarangay = barangay || 'Pianing';

  const pool = getPool();

  // 1 Admin per Barangay rule check on edit
  if (role === 'admin') {
    if (pool && getStatus().connected) {
      try {
        const [existingAdmins] = await pool.query(
          "SELECT id, name FROM users WHERE role = 'admin' AND status = 'Active' AND LOWER(barangay) = LOWER(?) AND id != ?",
          [userBarangay.trim(), id]
        );
        if (existingAdmins.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Barangay ${userBarangay} already has an active Administrator (${existingAdmins[0].name}). Only 1 Admin per Barangay is allowed.`
          });
        }
      } catch {}
    } else {
      const existing = (mockData.users || []).find(u => u.role === 'admin' && u.status === 'Active' && (u.barangay || 'Pianing').toLowerCase() === userBarangay.toLowerCase() && u.id !== id);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Barangay ${userBarangay} already has an active Administrator (${existing.name}). Only 1 Admin per Barangay is allowed.`
        });
      }
    }
  }
  if (pool && getStatus().connected) {
    try {
      const updates = [];
      const params = [];
      if (name) { updates.push('name = ?'); params.push(name.trim()); }
      if (email) { updates.push('email = ?'); params.push(email.toLowerCase().trim()); }
      if (role) { updates.push('role = ?'); params.push(role); }
      if (status) { updates.push('status = ?'); params.push(status); }
      if (barangay) { updates.push('barangay = ?'); params.push(barangay); }
      if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
      if (password) { updates.push('password_hash = ?'); params.push(password); }

      if (updates.length > 0) {
        params.push(id);
        await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      }
      return res.json({ success: true, message: 'User updated successfully.' });
    } catch (err) {
      console.warn('MySQL user update error:', err.message);
    }
  }

  const user = mockData.users.find(u => u.id === id);
  if (user) {
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (role) user.role = role;
    if (status) user.status = status;
    if (barangay) user.barangay = barangay;
    if (phone !== undefined) user.phone = phone;
    if (password) user.password_hash = password;
  }
  res.json({ success: true, message: 'User updated successfully.' });
});

app.post('/api/users/:id/reset-password', async (req, res) => {
  const id = Number(req.params.id);
  const { newPassword } = req.body;
  const passwordToSet = newPassword || '123456';
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordToSet, id]);
      return res.json({ success: true, message: `Password successfully reset to: ${passwordToSet}` });
    } catch (err) {
      console.warn('MySQL password reset error:', err.message);
    }
  }
  const user = mockData.users.find(u => u.id === id);
  if (user) user.password_hash = passwordToSet;
  res.json({ success: true, message: `Password successfully reset to: ${passwordToSet}` });
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

      // Auto-dispatch SMS + Email reminder on new immunization schedule
      if (parent_phone) {
        try {
          const smsMsg = `Barangay Health Center Alert: Scheduled ${vaccine_name} (Dose ${dose_number || 1}) immunization for ${child_name} on ${due_date || 'this week'}. Please bring your Baby Health Card.`;
          await pool.query(
            "INSERT INTO sms_notifications (recipient_name, recipient_phone, type, message, status) VALUES (?, ?, 'Immunization Reminder', ?, 'Sent')",
            [child_name, parent_phone, smsMsg]
          );
          sendLiveSms(parent_phone, smsMsg).catch(e => console.warn('iProg SMS immunization error:', e.message));

          // Email reminder if parent_email provided in request body
          const parentEmail = req.body.parent_email || null;
          if (parentEmail && parentEmail.includes('@')) {
            sendImmunizationReminderEmail({
              to:          parentEmail,
              childName:   child_name,
              parentName:  req.body.parent_name || '',
              vaccineName: vaccine_name,
              doseNumber:  dose_number || 1,
              dueDate:     due_date || 'this week',
            }).catch(e => console.warn('[Email] Immunization reminder email error:', e.message));
          }
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
  const today = new Date().toISOString().split('T')[0];

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query(
        "UPDATE immunizations SET status = ?, date_administered = CURDATE(), administered_by = ? WHERE id = ?",
        [status, administered_by || 'BHW Maria', id]
      );

      // ── AUTO-SCHEDULING: When dose is marked Completed, compute & insert next dose ──
      let nextDoseInfo = null;
      if (status === 'Completed') {
        const [immRows] = await pool.query("SELECT * FROM immunizations WHERE id = ?", [id]);
        const imm = immRows[0];
        if (imm) {
          const next = computeNextDose(imm.vaccine_name, imm.dose_number, today);
          nextDoseInfo = next;
          if (next.hasNext) {
            try {
              const [nextResult] = await pool.query(
                "INSERT INTO immunizations (child_name, parent_phone, vaccine_name, dose_number, status, due_date) VALUES (?, ?, ?, ?, 'Scheduled', ?)",
                [imm.child_name, imm.parent_phone || '', imm.vaccine_name, next.nextDose, next.nextDueDate]
              );
              console.log(`[Auto-Schedule] Created ${imm.vaccine_name} Dose ${next.nextDose} for ${imm.child_name} on ${next.nextDueDate}`);

              // Auto-SMS next dose reminder
              if (imm.parent_phone) {
                const nextSms = `Barangay Health Center: ${imm.child_name}'s next ${imm.vaccine_name} (Dose ${next.nextDose}) has been AUTO-SCHEDULED for ${next.displayDate}. Please bring your Baby Health Card.`;
                pool.query("INSERT INTO sms_notifications (recipient_name, recipient_phone, type, message, status) VALUES (?, ?, 'Auto-Schedule Reminder', ?, 'Sent')",
                  [imm.child_name, imm.parent_phone, nextSms]).catch(() => {});
                sendLiveSms(imm.parent_phone, nextSms).catch(e => console.warn('[SMS] Auto-schedule SMS error:', e.message));
              }

              // Auto-Email next dose reminder
              const parentEmail = req.body.parent_email || imm.parent_email || null;
              if (parentEmail && parentEmail.includes('@')) {
                sendImmunizationReminderEmail({
                  to:          parentEmail,
                  childName:   imm.child_name,
                  parentName:  req.body.parent_name || '',
                  vaccineName: imm.vaccine_name,
                  doseNumber:  next.nextDose,
                  dueDate:     next.displayDate,
                }).catch(e => console.warn('[Email] Auto-schedule email error:', e.message));
                console.log(`[Auto-Email] Next dose reminder sent to ${parentEmail}`);
              }
            } catch (schedErr) {
              console.warn('[Auto-Schedule] Could not create next dose:', schedErr.message);
            }
          }
        }
      }

      return res.json({ success: true, nextDose: nextDoseInfo });
    } catch (err) {
      console.warn('MySQL immunization update error:', err.message);
    }
  }

  // ── In-memory fallback ──
  const imm = mockData.immunizations.find(i => i.id === id);
  if (imm) {
    imm.status = status;
    imm.date_administered = today;
    imm.administered_by = administered_by || 'BHW Maria';
    imm.days_overdue = 0;

    // Auto-schedule next dose in mock data
    let nextDoseInfo = null;
    if (status === 'Completed') {
      const next = computeNextDose(imm.vaccine_name, imm.dose_number, today);
      nextDoseInfo = next;
      if (next.hasNext) {
        const nextMock = {
          id: mockData.immunizations.length + 1,
          child_name:    imm.child_name,
          parent_phone:  imm.parent_phone || '',
          vaccine_name:  imm.vaccine_name,
          dose_number:   next.nextDose,
          status:        'Scheduled',
          due_date:      next.nextDueDate,
          days_overdue:  0,
          administered_by: '',
          date_administered: null,
        };
        mockData.immunizations.unshift(nextMock);
        console.log(`[Auto-Schedule Mock] Created ${imm.vaccine_name} Dose ${next.nextDose} on ${next.nextDueDate}`);
      }
    }

    return res.json({ ...imm, nextDose: nextDoseInfo });
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
  const { mother_name, age, pregnancy_status, expected_due_date, last_visit, next_visit, risk_level, notes, mother_email, mother_phone } = req.body;

  // ── AUTO-SCHEDULING: compute next visit if not provided ──
  let computedNextVisit = next_visit;
  let scheduleInfo = null;
  if (!next_visit && pregnancy_status) {
    const auto = computeNextMaternalVisit(pregnancy_status, last_visit, expected_due_date);
    computedNextVisit = auto.nextVisit;
    scheduleInfo = auto;
    console.log(`[Auto-Schedule Maternal] Next visit auto-set to ${auto.nextVisit} (${auto.interval}) for ${mother_name}`);
  }

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        "INSERT INTO maternal_records (resident_id, mother_name, age, pregnancy_status, expected_due_date, last_visit, next_visit, risk_level, notes) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)",
        [mother_name, age, pregnancy_status, expected_due_date || null, last_visit, computedNextVisit, risk_level || 'Low', notes || '']
      );

      // Auto-Email maternal reminder if email provided
      if (mother_email && mother_email.includes('@')) {
        sendMaternalReminderEmail({
          to:              mother_email,
          motherName:      mother_name,
          nextVisit:       computedNextVisit || 'to be scheduled',
          pregnancyStatus: pregnancy_status,
          riskLevel:       risk_level || 'Low',
          notes:           scheduleInfo?.recommendation || notes || '',
        }).catch(e => console.warn('[Email] Maternal reminder email error:', e.message));
        console.log(`[Auto-Email] Maternal reminder sent to ${mother_email}`);
      }

      return res.status(201).json({
        id: result.insertId,
        ...req.body,
        next_visit: computedNextVisit,
        auto_schedule: scheduleInfo,
      });
    } catch (err) {
      console.warn('MySQL maternal insert error:', err.message);
    }
  }

  const newMat = {
    id: mockData.maternal.length + 1,
    resident_id: 1,
    mother_name,
    age: Number(age),
    pregnancy_status,
    expected_due_date,
    last_visit,
    next_visit: computedNextVisit,
    risk_level: risk_level || 'Low',
    notes: notes || '',
    auto_schedule: scheduleInfo,
  };
  mockData.maternal.unshift(newMat);
  res.status(201).json(newMat);
});

// -------------------------------------------------------------
// Health Appointments Endpoints (Pre-Marriage, Prenatal, Immunization, etc.)
// -------------------------------------------------------------
app.get('/api/appointments', async (req, res) => {
  const { resident_id, email, status, barangay } = req.query;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      let query = "SELECT * FROM health_appointments WHERE 1=1";
      const params = [];

      if (resident_id) {
        query += " AND resident_id = ?";
        params.push(resident_id);
      }
      if (email) {
        query += " AND (LOWER(resident_email) = LOWER(?) OR resident_id IN (SELECT id FROM users WHERE LOWER(email) = LOWER(?)))";
        params.push(email, email);
      }
      if (status && status !== 'all') {
        query += " AND status = ?";
        params.push(status);
      }
      if (barangay && barangay.toLowerCase() !== 'all' && !barangay.toLowerCase().includes('city-wide')) {
        query += " AND LOWER(barangay) = LOWER(?)";
        params.push(barangay);
      }

      query += " ORDER BY id DESC";
      const [rows] = await pool.query(query, params);
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL appointments fetch error:', err.message);
    }
  }

  // In-Memory Fallback
  let results = [...(mockData.appointments || [])];
  if (resident_id) {
    results = results.filter(a => String(a.resident_id) === String(resident_id));
  }
  if (email) {
    const em = email.toLowerCase().trim();
    results = results.filter(a => (a.resident_email || '').toLowerCase().trim() === em);
  }
  if (status && status !== 'all') {
    results = results.filter(a => a.status === status);
  }
  if (barangay && barangay.toLowerCase() !== 'all' && !barangay.toLowerCase().includes('city-wide')) {
    results = results.filter(a => (a.barangay || 'Pianing').toLowerCase() === barangay.toLowerCase());
  }
  res.json(results);
});

app.post('/api/appointments', async (req, res) => {
  const {
    resident_id,
    resident_name,
    resident_phone,
    resident_email,
    barangay,
    service_type,
    preferred_date,
    preferred_time,
    resident_notes
  } = req.body;

  const appointmentCode = `APT-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
  const bgy = barangay || 'Pianing';

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        `INSERT INTO health_appointments 
         (appointment_code, resident_id, resident_name, resident_phone, resident_email, barangay, service_type, preferred_date, preferred_time, status, resident_notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
        [appointmentCode, resident_id || null, resident_name, resident_phone || '', resident_email || '', bgy, service_type, preferred_date, preferred_time || 'Morning (8:00 AM - 11:30 AM)', resident_notes || '']
      );

      // Activity log
      logActivity({
        userName: resident_name || 'Resident',
        userRole: 'resident',
        action: `Booked Health Appointment (${service_type})`,
        actionType: 'Health',
        barangay: bgy,
        details: `Submitted appointment request for ${service_type} on ${preferred_date}. Ref: ${appointmentCode}`
      });

      // SMS acknowledgement
      if (resident_phone) {
        const smsMsg = `Barangay Health Center: Received your appointment request for ${service_type} (Ref: ${appointmentCode}). Our BHW team will confirm your schedule soon.`;
        sendLiveSms(resident_phone, smsMsg).catch(() => {});
      }

      return res.status(201).json({
        id: result.insertId,
        appointment_code: appointmentCode,
        status: 'Pending',
        ...req.body
      });
    } catch (err) {
      console.warn('MySQL appointment insert error:', err.message);
    }
  }

  const newApt = {
    id: (mockData.appointments?.length || 0) + 1,
    appointment_code: appointmentCode,
    resident_id: resident_id || null,
    resident_name,
    resident_phone: resident_phone || '',
    resident_email: resident_email || '',
    barangay: bgy,
    service_type,
    preferred_date,
    preferred_time: preferred_time || 'Morning (8:00 AM - 11:30 AM)',
    scheduled_date: null,
    scheduled_time: null,
    status: 'Pending',
    bhw_notes: '',
    resident_notes: resident_notes || '',
    attending_bhw: '',
    created_at: new Date().toLocaleString()
  };

  mockData.appointments = mockData.appointments || [];
  mockData.appointments.unshift(newApt);
  res.status(201).json(newApt);
});

app.put('/api/appointments/:id', async (req, res) => {
  const id = Number(req.params.id);
  const {
    status,
    scheduled_date,
    scheduled_time,
    bhw_notes,
    attending_bhw,
    user_name,
    user_role
  } = req.body;

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [existingRows] = await pool.query("SELECT * FROM health_appointments WHERE id = ?", [id]);
      const apt = existingRows[0];

      await pool.query(
        `UPDATE health_appointments 
         SET status = COALESCE(?, status),
             scheduled_date = COALESCE(?, scheduled_date),
             scheduled_time = COALESCE(?, scheduled_time),
             bhw_notes = COALESCE(?, bhw_notes),
             attending_bhw = COALESCE(?, attending_bhw)
         WHERE id = ?`,
        [status, scheduled_date || null, scheduled_time || null, bhw_notes, attending_bhw, id]
      );

      if (apt) {
        const finalStatus = status || apt.status;
        const finalDate = scheduled_date || apt.scheduled_date || apt.preferred_date;
        const finalTime = scheduled_time || apt.scheduled_time || apt.preferred_time;

        // Auto-dispatch SMS & Email notifications on confirmation / status change
        if (apt.resident_phone) {
          let smsText = `Barangay Health Center Update: Your appointment for ${apt.service_type} (Ref: ${apt.appointment_code}) is ${finalStatus.toUpperCase()}.`;
          if (finalStatus === 'Approved') {
            smsText = `Barangay Health Center: Your ${apt.service_type} appointment is CONFIRMED for ${finalDate} at ${finalTime}. Please bring a valid ID.`;
          }
          sendLiveSms(apt.resident_phone, smsText).catch(() => {});
        }

        if (apt.resident_email && apt.resident_email.includes('@')) {
          sendAppointmentStatusEmail({
            to: apt.resident_email,
            recipientName: apt.resident_name,
            serviceType: apt.service_type,
            appointmentCode: apt.appointment_code,
            status: finalStatus,
            scheduledDate: finalDate,
            scheduledTime: finalTime,
            bhwNotes: bhw_notes || apt.bhw_notes,
            attendingBhw: attending_bhw || apt.attending_bhw
          }).catch(() => {});
        }

        // Activity log
        logActivity({
          userName: user_name || 'BHW Maria Santos',
          userRole: user_role || 'bhw',
          action: `Updated Health Appointment (${apt.appointment_code})`,
          actionType: 'Health',
          barangay: apt.barangay || 'Pianing',
          details: `Set status to ${finalStatus} for ${apt.resident_name} (${apt.service_type})`
        });
      }

      return res.json({ success: true, message: 'Appointment updated successfully.' });
    } catch (err) {
      console.warn('MySQL appointment update error:', err.message);
    }
  }

  // In-memory fallback
  const apt = (mockData.appointments || []).find(a => a.id === id);
  if (apt) {
    if (status) apt.status = status;
    if (scheduled_date) apt.scheduled_date = scheduled_date;
    if (scheduled_time) apt.scheduled_time = scheduled_time;
    if (bhw_notes !== undefined) apt.bhw_notes = bhw_notes;
    if (attending_bhw) apt.attending_bhw = attending_bhw;
    return res.json(apt);
  }
  res.status(404).json({ error: 'Appointment not found' });
});

app.delete('/api/appointments/:id', async (req, res) => {
  const id = Number(req.params.id);
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query("DELETE FROM health_appointments WHERE id = ?", [id]);
      return res.json({ success: true });
    } catch (err) {
      console.warn('MySQL appointment delete error:', err.message);
    }
  }
  mockData.appointments = (mockData.appointments || []).filter(a => a.id !== id);
  res.json({ success: true });
});

// -------------------------------------------------------------
// Clinic Schedules Endpoints (Posted by BHW / Admin)
// -------------------------------------------------------------
app.get('/api/clinic-schedules', async (req, res) => {
  const { barangay } = req.query;
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      let query = "SELECT * FROM clinic_schedules WHERE 1=1";
      const params = [];
      if (barangay && barangay.toLowerCase() !== 'all' && !barangay.toLowerCase().includes('city-wide')) {
        query += " AND LOWER(barangay) = LOWER(?)";
        params.push(barangay);
      }
      query += " ORDER BY id ASC";
      const [rows] = await pool.query(query, params);
      return res.json(rows);
    } catch (err) {
      console.warn('MySQL clinic schedules fetch error:', err.message);
    }
  }
  let results = [...(mockData.clinicSchedules || [])];
  if (barangay && barangay.toLowerCase() !== 'all' && !barangay.toLowerCase().includes('city-wide')) {
    results = results.filter(s => (s.barangay || 'Pianing').toLowerCase() === barangay.toLowerCase());
  }
  res.json(results);
});

app.post('/api/clinic-schedules', async (req, res) => {
  const {
    title,
    service_type,
    day_of_week,
    time_slot,
    location,
    slots_available,
    bhw_in_charge,
    barangay,
    created_by
  } = req.body;

  const bgy = barangay || 'Pianing';

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        `INSERT INTO clinic_schedules 
         (title, service_type, day_of_week, time_slot, location, slots_available, bhw_in_charge, status, barangay, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)`,
        [title, service_type, day_of_week, time_slot, location || 'Barangay Health Center', slots_available || 20, bhw_in_charge || 'BHW on Duty', bgy, created_by || 'BHW Staff']
      );

      logActivity({
        userName: created_by || 'Health Center Staff',
        userRole: 'bhw',
        action: `Published Clinic Schedule: ${title}`,
        actionType: 'Health',
        barangay: bgy,
        details: `Added new regular clinic schedule for ${service_type} (${day_of_week}, ${time_slot})`
      });

      return res.status(201).json({ id: result.insertId, status: 'Active', ...req.body });
    } catch (err) {
      console.warn('MySQL clinic schedule insert error:', err.message);
    }
  }

  const newSch = {
    id: (mockData.clinicSchedules?.length || 0) + 1,
    title,
    service_type,
    day_of_week,
    time_slot,
    location: location || 'Barangay Health Center',
    slots_available: Number(slots_available) || 20,
    bhw_in_charge: bhw_in_charge || 'BHW on Duty',
    status: 'Active',
    barangay: bgy,
    created_by: created_by || 'BHW Staff',
    created_at: new Date().toISOString().split('T')[0]
  };

  mockData.clinicSchedules = mockData.clinicSchedules || [];
  mockData.clinicSchedules.push(newSch);
  res.status(201).json(newSch);
});

app.put('/api/clinic-schedules/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { title, service_type, day_of_week, time_slot, location, slots_available, bhw_in_charge, status } = req.body;

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query(
        `UPDATE clinic_schedules 
         SET title = COALESCE(?, title),
             service_type = COALESCE(?, service_type),
             day_of_week = COALESCE(?, day_of_week),
             time_slot = COALESCE(?, time_slot),
             location = COALESCE(?, location),
             slots_available = COALESCE(?, slots_available),
             bhw_in_charge = COALESCE(?, bhw_in_charge),
             status = COALESCE(?, status)
         WHERE id = ?`,
        [title, service_type, day_of_week, time_slot, location, slots_available, bhw_in_charge, status, id]
      );
      return res.json({ success: true });
    } catch (err) {
      console.warn('MySQL clinic schedule update error:', err.message);
    }
  }

  const sch = (mockData.clinicSchedules || []).find(s => s.id === id);
  if (sch) {
    if (title) sch.title = title;
    if (service_type) sch.service_type = service_type;
    if (day_of_week) sch.day_of_week = day_of_week;
    if (time_slot) sch.time_slot = time_slot;
    if (location) sch.location = location;
    if (slots_available !== undefined) sch.slots_available = slots_available;
    if (bhw_in_charge) sch.bhw_in_charge = bhw_in_charge;
    if (status) sch.status = status;
    return res.json(sch);
  }
  res.status(404).json({ error: 'Schedule not found' });
});

app.delete('/api/clinic-schedules/:id', async (req, res) => {
  const id = Number(req.params.id);
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      await pool.query("DELETE FROM clinic_schedules WHERE id = ?", [id]);
      return res.json({ success: true });
    } catch (err) {
      console.warn('MySQL clinic schedule delete error:', err.message);
    }
  }
  mockData.clinicSchedules = (mockData.clinicSchedules || []).filter(s => s.id !== id);
  res.json({ success: true });
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
  const { recipient_name, recipient_phone, recipient_email, type, message } = req.body;
  
  // 1. Dispatch live SMS via iProgTech Gateway
  sendLiveSms(recipient_phone, message).catch(e => console.warn('iProg SMS dispatch error:', e.message));

  // 2. Simultaneously dispatch Email to recipient if email is provided or in database
  (async () => {
    try {
      let targetEmail = recipient_email;
      if (!targetEmail) {
        // Look up resident email by phone or name
        const pool = getPool();
        if (pool && getStatus().connected) {
          const [uRows] = await pool.query(
            "SELECT email FROM users WHERE (phone = ? OR name = ?) AND email IS NOT NULL LIMIT 1",
            [recipient_phone, recipient_name]
          );
          if (uRows && uRows.length > 0 && uRows[0].email) {
            targetEmail = uRows[0].email;
          }
        }
        if (!targetEmail) {
          const matchedUser = mockData.users.find(u => 
            (u.phone && recipient_phone && u.phone.includes(recipient_phone.slice(-7))) ||
            (u.name && recipient_name && u.name.toLowerCase() === recipient_name.toLowerCase())
          );
          if (matchedUser && matchedUser.email) {
            targetEmail = matchedUser.email;
          }
        }
      }

      if (targetEmail && targetEmail.includes('@')) {
        await sendDirectNotificationEmail({
          to: targetEmail,
          recipientName: recipient_name,
          type: type || 'Barangay Notification',
          message: message
        });
        console.log(`📧 [Auto-Email Dual Dispatch] Sent synchronized email to ${targetEmail}`);
      }
    } catch (emailErr) {
      console.warn('Dual email dispatch error:', emailErr.message);
    }
  })();

  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        "INSERT INTO sms_notifications (recipient_name, recipient_phone, type, message, status) VALUES (?, ?, ?, ?, 'Sent')",
        [recipient_name, recipient_phone, type, message]
      );
      return res.status(201).json({ id: result.insertId, recipient_name, recipient_phone, recipient_email, type, message, status: 'Sent', sent_at: new Date().toISOString() });
    } catch (err) {
      console.warn('MySQL SMS insert error:', err.message);
    }
  }

  const newSms = { id: mockData.notifications.length + 1, recipient_name, recipient_phone, recipient_email, type, message, status: 'Sent', sent_at: new Date().toLocaleString() };
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
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          sender_name VARCHAR(100) NOT NULL,
          sender_role VARCHAR(50) NOT NULL,
          sender_email VARCHAR(100) DEFAULT '',
          recipient_name VARCHAR(100) DEFAULT '',
          recipient_role VARCHAR(50) DEFAULT 'staff',
          recipient_email VARCHAR(100) DEFAULT '',
          barangay VARCHAR(100) DEFAULT 'Pianing',
          message TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await safeAddColumn(pool, 'messages', 'sender_email', "VARCHAR(100) DEFAULT ''");
      await safeAddColumn(pool, 'messages', 'recipient_name', "VARCHAR(100) DEFAULT ''");
      await safeAddColumn(pool, 'messages', 'recipient_role', "VARCHAR(50) DEFAULT 'staff'");
      await safeAddColumn(pool, 'messages', 'recipient_email', "VARCHAR(100) DEFAULT ''");
      await safeAddColumn(pool, 'messages', 'barangay', "VARCHAR(100) DEFAULT 'Pianing'");
      await safeAddColumn(pool, 'messages', 'timestamp', "DATETIME DEFAULT CURRENT_TIMESTAMP");

      const [rows] = await pool.query('SELECT * FROM messages ORDER BY id ASC');
      return res.json(rows || []);
    } catch (err) {
      console.warn('MySQL messages fetch error:', err.message);
    }
  }
  res.json(mockData.messages || []);
});

app.post('/api/messages', async (req, res) => {
  const { sender_name, sender_role, sender_email, recipient_name, recipient_role, recipient_email, barangay, message } = req.body || {};
  if (!sender_name || !message) {
    return res.status(400).json({ error: 'sender_name and message are required' });
  }
  const pool = getPool();
  if (pool && getStatus().connected) {
    try {
      const [result] = await pool.query(
        'INSERT INTO messages (sender_name, sender_role, sender_email, recipient_name, recipient_role, recipient_email, barangay, message, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [sender_name, sender_role || 'staff', sender_email || '', recipient_name || '', recipient_role || 'staff', recipient_email || '', barangay || 'Pianing', message]
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
    sender_email: sender_email || '',
    recipient_name: recipient_name || '',
    recipient_role: recipient_role || 'staff',
    recipient_email: recipient_email || '',
    barangay: barangay || 'Pianing',
    message,
    timestamp: new Date().toISOString()
  };
  mockData.messages = mockData.messages || [];
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


// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULING API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/scheduling/vaccines – return full vaccine schedule list
app.get('/api/scheduling/vaccines', (req, res) => {
  const list = Object.entries(VACCINE_SCHEDULE).map(([name, doses]) => ({
    vaccine: name,
    totalDoses: doses.length,
    doses,
  }));
  res.json(list);
});

// POST /api/scheduling/next-dose – compute next dose after completing one
// Body: { vaccine_name, completed_dose, administered_date }
app.post('/api/scheduling/next-dose', (req, res) => {
  const { vaccine_name, completed_dose, administered_date } = req.body;
  if (!vaccine_name || !completed_dose) {
    return res.status(400).json({ error: 'vaccine_name and completed_dose are required.' });
  }
  const result = computeNextDose(vaccine_name, Number(completed_dose), administered_date);
  res.json(result);
});

// POST /api/scheduling/full-vaccine-schedule – get complete vaccine schedule from birth date
// Body: { vaccine_name, birth_date }
app.post('/api/scheduling/full-vaccine-schedule', (req, res) => {
  const { vaccine_name, birth_date } = req.body;
  if (!vaccine_name || !birth_date) {
    return res.status(400).json({ error: 'vaccine_name and birth_date are required.' });
  }
  const schedule = getFullVaccineSchedule(vaccine_name, birth_date);
  res.json(schedule);
});

// POST /api/scheduling/next-maternal-visit – compute next prenatal/postnatal visit
// Body: { pregnancy_status, last_visit, expected_due_date }
app.post('/api/scheduling/next-maternal-visit', (req, res) => {
  const { pregnancy_status, last_visit, expected_due_date } = req.body;
  if (!pregnancy_status) {
    return res.status(400).json({ error: 'pregnancy_status is required.' });
  }
  const result = computeNextMaternalVisit(pregnancy_status, last_visit, expected_due_date);
  res.json(result);
});

// POST /api/scheduling/full-prenatal-schedule – generate complete prenatal visit schedule
// Body: { first_visit_date, expected_due_date }
app.post('/api/scheduling/full-prenatal-schedule', (req, res) => {
  const { first_visit_date, expected_due_date } = req.body;
  if (!first_visit_date || !expected_due_date) {
    return res.status(400).json({ error: 'first_visit_date and expected_due_date are required.' });
  }
  const schedule = getFullPrenatalSchedule(first_visit_date, expected_due_date);
  res.json(schedule);
});

// GET /api/scheduling/overdue – get all overdue immunizations + maternal visits
app.get('/api/scheduling/overdue', async (req, res) => {
  const pool = getPool();
  let immunizations = mockData.immunizations;
  let maternal = mockData.maternal;

  if (pool && getStatus().connected) {
    try {
      const [immRows] = await pool.query("SELECT * FROM immunizations WHERE status != 'Completed'");
      const [matRows] = await pool.query("SELECT * FROM maternal_records");
      immunizations = immRows;
      maternal = matRows;
    } catch (err) {
      console.warn('Overdue fetch DB error:', err.message);
    }
  }

  res.json({
    overdueImmunizations: getOverdueImmunizations(immunizations),
    overdueMaternalVisits: getOverdueMaternalVisits(maternal),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/email/test – send a test email to verify SMTP config
app.post('/api/email/test', async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'Email recipient (to) is required.' });
  const result = await sendEmail({
    to,
    subject: '[Barangay Pianing] Email System Test',
    html: `<div style="font-family:Arial,sans-serif;padding:20px;"><h2 style="color:#1e3a5f;">✅ Email System Active</h2><p>This is a test message from the <strong>Smart Barangay Management System</strong>.</p><p>If you received this, your email notification system is correctly configured.</p><hr/><p style="color:#6b7280;font-size:12px;">Barangay Pianing, Butuan City</p></div>`,
    text: 'Email test from Barangay Pianing Smart System. Configuration is working correctly.',
  });
  res.json(result);
});

// POST /api/email/announcement – broadcast an announcement email to multiple recipients
// Body: { recipients: [{ email, name }], title, body, sender }
app.post('/api/email/announcement', async (req, res) => {
  const { recipients, title, body: bodyText, sender } = req.body;
  if (!recipients?.length || !title || !bodyText) {
    return res.status(400).json({ error: 'recipients, title, and body are required.' });
  }

  const results = await Promise.allSettled(
    recipients.map(r =>
      sendAnnouncementEmail({
        to:            r.email,
        recipientName: r.name || 'Resident',
        title,
        body:          bodyText,
        sender,
      })
    )
  );

  const sent     = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
  const failed   = results.length - sent;

  res.json({ total: results.length, sent, failed });
});

// POST /api/email/send – generic send-email endpoint
// Body: { to, subject, html, text }
app.post('/api/email/send', async (req, res) => {
  const { to, subject, html, text } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'to and subject are required.' });
  const result = await sendEmail({ to, subject, html, text });
  res.json(result);
});

// GET /api/email/status – check whether email SMTP is configured
app.get('/api/email/status', (req, res) => {
  const configured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS &&
    !process.env.EMAIL_USER.includes('your_gmail') &&
    !process.env.EMAIL_PASS.includes('your_app_password'));
  res.json({
    configured,
    host:       process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:       process.env.EMAIL_PORT || '465',
    user:       configured ? process.env.EMAIL_USER : null,
    mode:       configured ? 'live' : 'simulation',
    message:    configured
      ? `Email configured via ${process.env.EMAIL_HOST || 'smtp.gmail.com'}`
      : 'Email running in simulation mode. Set EMAIL_USER and EMAIL_PASS in .env to enable live sending.',
  });
});

// Handle React SPA wildcard routing in production
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.resolve(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
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
