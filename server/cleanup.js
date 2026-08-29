import mysql from 'mysql2/promise';

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'smart_db'
  });
  await pool.query("DELETE FROM users WHERE email IN ('admin@barangay.gov', 'staff@barangay.gov', 'bhw@barangay.gov', 'bhw.anticala@barangay.gov')");
  console.log('Deleted auto generated accounts from DB successfully.');
  process.exit(0);
}

run().catch(console.error);
