const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: 'pos_system',
    port: process.env.DB_PORT || 3306
  });

  try {
    try {
      await c.query(`ALTER TABLE customers ADD COLUMN total_purchases DECIMAL(12,2) DEFAULT 0.00`);
    } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }

    try {
      await c.query(`ALTER TABLE customers ADD COLUMN rating ENUM('Standard', 'Bronze', 'Silver', 'Gold', 'Platinum') DEFAULT 'Standard'`);
    } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
    
    const [sales] = await c.query(`
        SELECT customer_id, SUM(total_amount) as sum_total 
        FROM sales 
        WHERE customer_id IS NOT NULL AND status = 'Completed'
        GROUP BY customer_id
    `);

    for (const row of sales) {
        let rating = 'Standard';
        if (row.sum_total >= 500000) rating = 'Platinum';
        else if (row.sum_total >= 100000) rating = 'Gold';
        else if (row.sum_total >= 50000) rating = 'Silver';
        else if (row.sum_total >= 10000) rating = 'Bronze';

        await c.query(`
            UPDATE customers SET total_purchases = ?, rating = ? WHERE id = ?
        `, [row.sum_total, rating, row.customer_id]);
    }
    
    console.log('Customers table updated successfully');
  } catch (err) {
    console.error('Error updating customers table:', err.message);
  } finally {
    c.end();
  }
}

run();
