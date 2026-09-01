const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
  const conn = await mysql.createConnection({ user: 'root', password: process.env.DB_PASSWORD||'', database: 'pos_system' });
  const [rows] = await conn.query('DESCRIBE users');
  console.log(rows);
  process.exit(0);
}
run();
