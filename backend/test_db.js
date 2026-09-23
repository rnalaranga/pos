const mysql = require('mysql2/promise');
require('dotenv').config();
async function test() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'pos_system',
    port: process.env.DB_PORT || 3306
  });
  const [rows] = await db.query('SELECT is_service FROM products LIMIT 1');
  console.log(JSON.stringify(rows));
  console.log(typeof rows[0].is_service);
  process.exit(0);
}
test();
