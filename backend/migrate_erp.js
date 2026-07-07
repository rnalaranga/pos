const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateERP() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'pos_system',
    port: process.env.DB_PORT || 3306
  });

  try {
    console.log('Starting ERP Database Migration Phase 1...');

    // 1. Warehouses
    console.log('Creating warehouses table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        location VARCHAR(255),
        is_default BOOLEAN DEFAULT FALSE,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL
      )
    `);

    // Insert default warehouse if none exists
    const [warehouses] = await connection.execute('SELECT id FROM warehouses LIMIT 1');
    if (warehouses.length === 0) {
      await connection.execute(`
        INSERT INTO warehouses (name, location, is_default) 
        VALUES ('Main Store', 'Primary Location', TRUE)
      `);
      console.log('Default Main Store warehouse created.');
    }

    // 2. Warehouse Stock (Per-Warehouse Inventory balances)
    console.log('Creating warehouse_stock table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS warehouse_stock (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        warehouse_id INT NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
        UNIQUE KEY \`product_warehouse_unique\` (product_id, warehouse_id)
      )
    `);

    // Migrate existing stock to Main Store
    console.log('Migrating existing stock to warehouse_stock...');
    const [mainWarehouse] = await connection.execute('SELECT id FROM warehouses WHERE is_default = TRUE LIMIT 1');
    const warehouseId = mainWarehouse[0].id;
    
    // Insert existing products into warehouse_stock if not exists
    await connection.execute(`
      INSERT IGNORE INTO warehouse_stock (product_id, warehouse_id, stock)
      SELECT id, ?, stock FROM products
    `, [warehouseId]);

    // 3. Stock Ledger (Immutable transaction history)
    console.log('Creating stock_ledger table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS stock_ledger (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        warehouse_id INT NOT NULL,
        transaction_type ENUM('Opening Stock', 'GRN', 'POS Sale', 'Sales Return', 'Purchase Return', 'Stock Adjustment', 'Damage', 'Transfer In', 'Transfer Out', 'Manual Entry') NOT NULL,
        reference_id VARCHAR(100), -- ID of the GRN, Sale, etc.
        qty_in INT NOT NULL DEFAULT 0,
        qty_out INT NOT NULL DEFAULT 0,
        previous_balance INT NOT NULL DEFAULT 0,
        current_balance INT NOT NULL DEFAULT 0,
        user_id INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // 4. Purchase Orders
    console.log('Creating purchase_orders table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE NOT NULL,
        supplier_id INT NOT NULL,
        user_id INT NOT NULL,
        expected_date DATE,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        status ENUM('Draft', 'Pending', 'Approved', 'Completed', 'Cancelled', 'Partial') DEFAULT 'Draft',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT NULL,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('Creating purchase_order_items table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        po_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        received_qty INT NOT NULL DEFAULT 0,
        purchase_price DECIMAL(12,2) NOT NULL,
        total DECIMAL(12,2) NOT NULL,
        FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
    
    // Add po_id to GRN
    console.log('Adding po_id to grn table...');
    try {
      await connection.execute('ALTER TABLE grn ADD COLUMN po_id INT NULL');
      await connection.execute('ALTER TABLE grn ADD FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('po_id already exists in grn.');
      } else {
        throw e;
      }
    }

    console.log('ERP Database Migration Phase 1 completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrateERP();
