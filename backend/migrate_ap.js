const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'pos_system',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log("Connected to DB, running AP migrations...");

    // 1. Add paid_amount and payment_status to grn
    await db.query(`
      ALTER TABLE grn 
      ADD COLUMN paid_amount DECIMAL(12,2) DEFAULT 0.00 AFTER total_amount,
      ADD COLUMN payment_status ENUM('Unpaid', 'Partial', 'Paid') DEFAULT 'Unpaid' AFTER paid_amount;
    `).catch(e => {
        if (e.code === 'ER_DUP_FIELDNAME') console.log("grn columns already exist, skipping.");
        else throw e;
    });

    // 2. Add grn_id to supplier_payments
    await db.query(`
      ALTER TABLE supplier_payments 
      ADD COLUMN grn_id INT NULL AFTER supplier_id,
      ADD FOREIGN KEY (grn_id) REFERENCES grn(id) ON DELETE SET NULL;
    `).catch(e => {
        if (e.code === 'ER_DUP_FIELDNAME') console.log("supplier_payments columns already exist, skipping.");
        else throw e;
    });

    // 3. Update existing GRNs to 'Paid' if their outstanding_balance is handled, 
    // actually it's safer to just leave old ones as Unpaid or set them to Paid to not confuse the user.
    // Given it's a test environment mostly, we can set all past GRNs to 'Paid' to start fresh.
    await db.query(`UPDATE grn SET payment_status = 'Paid', paid_amount = total_amount WHERE status = 'Completed'`);

    console.log("Migration complete!");
    db.end();
  } catch(e) {
    console.error("Migration failed:", e);
  }
}
migrate();
