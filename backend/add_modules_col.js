const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({ user: 'root', password: process.env.DB_PASSWORD||'', database: 'pos_system' });
  try {
    await conn.query('ALTER TABLE users ADD COLUMN modules JSON');
    console.log("Added 'modules' column to users table.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column 'modules' already exists.");
    } else {
      console.error(err);
    }
  }

  try {
    const allModules = JSON.stringify(["dashboard","pos","products","categories","inventory","grn","suppliers","customers","warehouses","settings","reports","users","sales_history"]);
    await conn.query('UPDATE users SET modules = ? WHERE role = "Admin" AND (modules IS NULL OR JSON_LENGTH(modules) = 0)', [allModules]);
    
    const defaultModules = JSON.stringify(["dashboard","pos"]);
    await conn.query('UPDATE users SET modules = ? WHERE role != "Admin" AND (modules IS NULL OR JSON_LENGTH(modules) = 0)', [defaultModules]);
    
    console.log("Updated existing users with default modules.");
  } catch (err) {
    console.error("Error updating users:", err);
  }
  process.exit(0);
}
run();
