const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDB() {
  console.log("Connecting to database...");
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'pos_system',
    port: process.env.DB_PORT || 3306
  });

  console.log("Connected successfully. Running updates...\n");

  const queries = [
    // Loyalty Points on Customers
    "ALTER TABLE customers ADD COLUMN loyalty_points INT NOT NULL DEFAULT 0;",
    
    // Analytics Columns on Customers
    "ALTER TABLE customers ADD COLUMN total_purchases DECIMAL(12,2) DEFAULT 0.00;",
    "ALTER TABLE customers ADD COLUMN rating ENUM('Standard', 'Bronze', 'Silver', 'Gold', 'Platinum') DEFAULT 'Standard';",
    
    // Categories Hierarchy
    "ALTER TABLE categories ADD COLUMN parent_id INT DEFAULT NULL;",
    "ALTER TABLE categories ADD CONSTRAINT fk_category_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE;",
    
    // Loyalty Points on Sales
    "ALTER TABLE sales ADD COLUMN loyalty_points_earned INT NOT NULL DEFAULT 0;",
    "ALTER TABLE sales ADD COLUMN loyalty_points_used INT NOT NULL DEFAULT 0;",
    
    // Supplier Payments Table
    `CREATE TABLE IF NOT EXISTS supplier_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_id INT NOT NULL,
      payment_method ENUM('Cash', 'Card', 'Bank Transfer', 'Cheque') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      reference_number VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );`,

    // Customer Payments Table
    `CREATE TABLE IF NOT EXISTS customer_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      payment_method ENUM('Cash', 'Card', 'Bank Transfer', 'Cheque') NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      reference_number VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );`,
    
    // Service Materials Table
    `CREATE TABLE IF NOT EXISTS service_materials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      service_id INT NOT NULL,
      material_id INT NOT NULL,
      quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
      FOREIGN KEY (service_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (material_id) REFERENCES products(id) ON DELETE CASCADE
    );`,
    
    // Expenses Table
    `CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      category VARCHAR(100) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      description TEXT,
      expense_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`,

    // Bank Deposits Table
    `CREATE TABLE IF NOT EXISTS bank_deposits (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      bank_name VARCHAR(100) NOT NULL,
      reference_number VARCHAR(100),
      amount DECIMAL(12,2) NOT NULL,
      deposit_date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`
  ];

  for (let i = 0; i < queries.length; i++) {
    try {
      await db.query(queries[i]);
      console.log(`[SUCCESS] Executed query ${i + 1}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(`[SKIPPED] Column already exists for query ${i + 1}`);
      } else if (e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`[SKIPPED] Table already exists for query ${i + 1}`);
      } else {
        console.log(`[ERROR] Query ${i + 1} failed:`, e.message);
      }
    }
  }

  // Recalculate customer ratings based on historical sales
  console.log("\nRecalculating historical customer ratings...");
  try {
    const [sales] = await db.query(`
        SELECT customer_id, SUM(total_amount) as sum_total 
        FROM sales 
        WHERE customer_id IS NOT NULL AND status = 'Completed'
        GROUP BY customer_id
    `);

    let updated = 0;
    for (const row of sales) {
        let rating = 'Standard';
        if (row.sum_total >= 500000) rating = 'Platinum';
        else if (row.sum_total >= 100000) rating = 'Gold';
        else if (row.sum_total >= 50000) rating = 'Silver';
        else if (row.sum_total >= 10000) rating = 'Bronze';

        await db.query(`
            UPDATE customers SET total_purchases = ?, rating = ? WHERE id = ?
        `, [row.sum_total, rating, row.customer_id]);
        updated++;
    }
    console.log(`[SUCCESS] Updated ${updated} customers' ratings and total purchases.`);
  } catch (err) {
    console.log(`[ERROR] Failed to recalculate customer ratings:`, err.message);
  }

  
    console.log("Checking shifts table...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        opening_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closing_time TIMESTAMP NULL,
        opening_balance DECIMAL(12, 2) DEFAULT 0.00,
        status ENUM('Open', 'Closed') DEFAULT 'Open',
        expected_cash DECIMAL(12, 2) DEFAULT 0.00,
        expected_card DECIMAL(12, 2) DEFAULT 0.00,
        expected_credit DECIMAL(12, 2) DEFAULT 0.00,
        actual_cash DECIMAL(12, 2) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('[SUCCESS] shifts table created or exists.');

  console.log("\nDatabase update completed!");
  await db.end();
}

updateDB();
