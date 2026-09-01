// One-shot DB fix: checks role column type and fixes nurse accounts
import { testConnection, getPool } from './config/db.js';

await testConnection();
const pool = getPool();

// 1. Check current role column type
const [cols] = await pool.query(
  `SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'smart_db' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'`
);
console.log('Role column type:', cols[0]?.COLUMN_TYPE);

// 2. Ensure it is VARCHAR(50) - not ENUM
try {
  await pool.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'resident'");
  console.log('✅ Role column confirmed as VARCHAR(50)');
} catch (e) {
  console.log('Column already correct or error:', e.message);
}

// 3. Show all users and their roles
const [users] = await pool.query('SELECT id, name, email, role FROM users ORDER BY id DESC');
console.log('\nAll users in DB:');
users.forEach(u => console.log(`  #${u.id} ${u.name} <${u.email}> role=${u.role}`));

// 4. Fix any accounts where role is empty/null
const [emptyFix] = await pool.query("UPDATE users SET role = 'staff' WHERE role IS NULL OR role = ''");
if (emptyFix.affectedRows > 0) {
  console.log(`\n✅ Fixed ${emptyFix.affectedRows} accounts with empty role → set to 'staff'`);
}

console.log('\n✅ Done. You can now create a nurse account and the role will be stored correctly.');
process.exit(0);
