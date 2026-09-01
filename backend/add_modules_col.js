const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const conn = await mysql.createConnection({ user: 'root', password: process.env.DB_PASSWORD||'', database: 'pos_system' });
  try {
    await conn.query('ALTER TABLE users ADD COLUMN modules JSON');
    console.log("Added 'modules' column to users table.");
    
    // Set default modules for existing Admin users (all modules)
    const allModules = JSON.stringify(["dashboard","pos","products","categories","inventory","grn","suppliers","customers","warehouses","settings","reports","users","sales_history"]);
    await conn.query('UPDATE users SET modules = ? WHERE role = "Admin"', [allModules]);
    
    // Set default for others
    const defaultModules = JSON.stringify(["dashboard","pos"]);
    await conn.query('UPDATE users SET modules = ? WHERE role != "Admin"', [defaultModules]);
    
    console.log("Updated existing users with default modules.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column 'modules' already exists.");
    } else {
      console.error(err);
    }
  }
  process.exit(0);
}
run();
