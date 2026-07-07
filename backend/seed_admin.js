const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedAdmin() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'pos_system',
    port: process.env.DB_PORT || 3306,
  });

  console.log('Connected to database.');

  // Hash the password
  const password = await bcrypt.hash('admin123', 10);

  try {
    await connection.execute(
      `INSERT INTO users (username, password, full_name, role, status) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      ['admin', password, 'System Administrator', 'Admin', 'Active']
    );
    console.log('✅ Admin user created successfully!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
  } catch (err) {
    console.error('Error seeding user:', err.message);
  }

  await connection.end();
}

seedAdmin();
