-- =========================================================
-- Smart Barangay System - MySQL Seed Data
-- =========================================================

USE `smart_db`;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `residents`;
TRUNCATE TABLE `document_requests`;
TRUNCATE TABLE `maternal_records`;
TRUNCATE TABLE `immunizations`;
TRUNCATE TABLE `sms_notifications`;
TRUNCATE TABLE `activity_logs`;
TRUNCATE TABLE `messages`;
TRUNCATE TABLE `faq_knowledge`;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed Users (5 Roles: superadmin, admin, staff, bhw, resident)
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `status`, `last_login`) VALUES
(1, 'Super Admin Rodrigo Lim', 'superadmin@barangay.gov', '123', 'superadmin', 'Active', NOW()),
(2, 'Admin Juan Dela Cruz', 'juan.admin@barangay.gov', '123', 'admin', 'Active', NOW()),
(3, 'Clerk Ana Reyes', 'ana.staff@barangay.gov', '123', 'staff', 'Active', NOW() - INTERVAL 1 DAY),
(4, 'Officer Pedro Garcia', 'pedro.staff@barangay.gov', '123', 'staff', 'Inactive', NOW() - INTERVAL 5 DAY),
(5, 'BHW Maria Santos', 'maria.bhw@barangay.gov', '123', 'bhw', 'Active', NOW()),
(6, 'BHW Ligaya Cruz', 'ligaya.bhw@barangay.gov', '123', 'bhw', 'Active', NOW() - INTERVAL 2 DAY),
(7, 'Juan Resident', 'juan.resident@gmail.com', '123', 'resident', 'Active', NOW() - INTERVAL 1 DAY)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `role` = VALUES(`role`);

-- Seed Residents
INSERT INTO `residents` (`id`, `first_name`, `middle_name`, `last_name`, `date_of_birth`, `gender`, `civil_status`, `address`, `household_id`, `phone`, `email`) VALUES
(1, 'Juan', 'Perez', 'Dela Cruz', '1988-04-12', 'Male', 'Married', '123 Sampaguita St, Zone 1', 'HH-001', '09171234567', 'juan.delacruz@gmail.com'),
(2, 'Maria', 'Clara', 'Santos', '1992-08-25', 'Female', 'Single', '456 Narra Ave, Zone 2', 'HH-002', '09182345678', 'maria.santos@gmail.com'),
(3, 'Pedro', 'Alcantara', 'Garcia', '1985-11-03', 'Male', 'Married', '789 Mabini St, Zone 1', 'HH-003', '09193456789', 'pedro.garcia@gmail.com'),
(4, 'Ana', 'Bautista', 'Reyes', '1995-02-14', 'Female', 'Single', '101 Rizal St, Zone 3', 'HH-004', '09204567890', 'ana.reyes@gmail.com'),
(5, 'Teresa', 'Luna', 'Ramos', '1994-06-18', 'Female', 'Married', '202 Acacia St, Zone 2', 'HH-005', '09215678901', 'teresa.ramos@gmail.com')
ON DUPLICATE KEY UPDATE `first_name` = VALUES(`first_name`);

-- Seed Document Requests
INSERT INTO `document_requests` (`id`, `request_code`, `resident_id`, `resident_name`, `document_type`, `purpose`, `status`, `requested_at`, `processed_at`, `processed_by`) VALUES
(1, 'DOC-001', 1, 'Juan Dela Cruz', 'Barangay Clearance', 'Employment Requirements', 'Pending', NOW() - INTERVAL 3 HOUR, NULL, ''),
(2, 'DOC-002', 2, 'Maria Santos', 'Certificate of Residency', 'Bank Account Opening', 'Processing', NOW() - INTERVAL 2 HOUR, NULL, ''),
(3, 'DOC-003', 3, 'Pedro Garcia', 'Business Permit', 'Sari-Sari Store Operation', 'Pending', NOW() - INTERVAL 1 DAY, NULL, ''),
(4, 'DOC-004', 4, 'Ana Reyes', 'Barangay ID', 'Personal Identification', 'Completed', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 4 HOUR, 'Admin Juan')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- Seed Maternal Records
INSERT INTO `maternal_records` (`id`, `resident_id`, `mother_name`, `age`, `pregnancy_status`, `expected_due_date`, `last_visit`, `next_visit`, `risk_level`, `notes`) VALUES
(1, 5, 'Teresa Ramos', 29, 'Prenatal - 2nd Trimester', '2026-09-15', '2026-05-01', '2026-05-15', 'Low', 'Normal blood pressure. Prescribed prenatal vitamins.'),
(2, 2, 'Rosa Mendez', 31, 'Prenatal - 3rd Trimester', '2026-06-10', '2026-04-28', '2026-05-12', 'Moderate', 'Monitor blood sugar levels twice a week.'),
(3, 4, 'Lucia Torres', 26, 'Postnatal - 2 weeks', NULL, '2026-05-03', '2026-05-17', 'Low', 'Healthy newborn recovery. Exclusive breastfeeding.')
ON DUPLICATE KEY UPDATE `mother_name` = VALUES(`mother_name`);

-- Seed Child Health & Immunizations
INSERT INTO `immunizations` (`id`, `child_name`, `parent_phone`, `vaccine_name`, `dose_number`, `status`, `date_administered`, `due_date`, `days_overdue`, `administered_by`) VALUES
(1, 'Baby Maria Santos', '09182345678', 'BCG', 1, 'Completed', '2026-05-05', '2026-05-05', 0, 'BHW Maria'),
(2, 'Baby Juan Dela Cruz', '09171234567', 'Hepatitis B', 1, 'Completed', '2026-05-04', '2026-05-04', 0, 'BHW Maria'),
(3, 'Baby Ana Reyes', '09204567890', 'DPT', 2, 'Completed', '2026-05-03', '2026-05-03', 0, 'BHW Maria'),
(4, 'Baby Sofia Martinez', '09226789012', 'MMR', 1, 'Overdue', NULL, '2026-04-20', 16, ''),
(5, 'Baby Carlos Lopez', '09237890123', 'DPT Booster', 3, 'Overdue', NULL, '2026-04-25', 11, ''),
(6, 'Baby Elena Cruz', '09248901234', 'Hepatitis B', 2, 'Overdue', NULL, '2026-04-28', 8, '')
ON DUPLICATE KEY UPDATE `child_name` = VALUES(`child_name`);

-- Seed SMS Notifications
INSERT INTO `sms_notifications` (`id`, `recipient_name`, `recipient_phone`, `type`, `message`, `status`, `sent_at`) VALUES
(1, 'Sofia Martinez', '09226789012', 'Immunization Reminder', 'Reminder: Baby Sofia is scheduled for MMR vaccine at Barangay Health Center.', 'Sent', NOW() - INTERVAL 1 DAY),
(2, 'Juan Dela Cruz', '09171234567', 'Document Ready', 'Your Barangay Clearance request DOC-001 is now being processed.', 'Sent', NOW() - INTERVAL 3 HOUR);

-- Seed Activity Logs
INSERT INTO `activity_logs` (`id`, `user_name`, `user_role`, `action`, `timestamp`) VALUES
(1, 'Admin Juan', 'Admin', 'Approved Barangay ID for Ana Reyes (DOC-004)', NOW() - INTERVAL 4 HOUR),
(2, 'BHW Maria', 'BHW', 'Administered BCG vaccine to Baby Maria Santos', NOW() - INTERVAL 1 DAY);

-- Seed System Messages (Barangay Admin <-> BHW Staff)
INSERT INTO `messages` (`id`, `sender_name`, `sender_role`, `recipient_role`, `message`, `timestamp`) VALUES
(1, 'BHW Maria Santos', 'bhw', 'admin', 'Good morning Captain/Admin Juan! We scheduled an immunization drive for Zone 2 this Friday. Please prepare clearance announcements.', NOW() - INTERVAL 2 HOUR),
(2, 'Admin Juan Dela Cruz', 'admin', 'bhw', 'Noted BHW Maria! We will post the announcement on the resident portal and issue SMS alerts today.', NOW() - INTERVAL 1 HOUR);

-- Seed FAQ Knowledge Base for Resident Chatbot
INSERT INTO `faq_knowledge` (`id`, `topic`, `keywords`, `response`) VALUES
(1, 'Barangay Clearance Requirements', 'clearance,requirement,document,get clearance,how to request', 'To request a Barangay Clearance, you need a valid Government ID, Cedula (Community Tax Certificate), and proof of residency in Zone 1-4. Processing takes 1-2 business days.'),
(2, 'Health Center Hours', 'hours,open,schedule,time,health center,clinic', 'The Barangay Health Center is open Monday to Friday, from 8:00 AM to 5:00 PM. Immunizations are conducted every Wednesday and Friday morning.'),
(3, 'Vaccination & Immunization', 'vaccine,immunization,baby,infant,bcg,polio,mmr,schedule', 'Free infant vaccines (BCG, Hepatitis B, DPT, Polio, MMR) are available for all barangay residents. Please bring your child mother-baby handbook during clinic visits.'),
(4, 'Business Permit Requirements', 'business,permit,store,sari-sari,commercial', 'Barangay Business Permit requirements include: DTI Registration (if applicable), Lease Contract / Land Title, and Owner Valid ID. Submit requests through the Admin Portal.');

