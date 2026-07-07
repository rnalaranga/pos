const mysql = require('mysql2/promise');
require('dotenv').config();
async function alterDB() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: process.env.DB_PORT
  });
  try {
    await db.query('ALTER TABLE customers ADD COLUMN loyalty_points INT NOT NULL DEFAULT 0;');
    console.log('Added loyalty_points to customers');
  } catch(e) { console.log(e.message); }
  
  try {
    await db.query('ALTER TABLE sales ADD COLUMN loyalty_points_earned INT NOT NULL DEFAULT 0;');
    await db.query('ALTER TABLE sales ADD COLUMN loyalty_points_used INT NOT NULL DEFAULT 0;');
    console.log('Added loyalty points columns to sales');
  } catch(e) { console.log(e.message); }
  
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS supplier_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_id INT NOT NULL,
      payment_method ENUM('Cash', 'Card', 'Bank Transfer', 'Cheque') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      reference_number VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );`);
    console.log('Created supplier_payments table');
  } catch(e) { console.log(e.message); }

  try {
    await db.query(`CREATE TABLE IF NOT EXISTS customer_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      payment_method ENUM('Cash', 'Card', 'Bank Transfer', 'Cheque') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      reference_number VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );`);
    console.log('Created customer_payments table');
  } catch(e) { console.log(e.message); }

  db.end();
}
alterDB();
