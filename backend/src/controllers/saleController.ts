import { Request, Response } from 'express';
import db from '../config/db';

export const createSale = async (req: any, res: Response) => {
  const { 
    customer_id, 
    subtotal, 
    discount, 
    tax, 
    total_amount, 
    payment_method, 
    amount_paid, 
    status, 
    items,
    loyalty_points_used,
    loyalty_points_earned
  } = req.body;

  const user_id = req.user.id;
  const balance = amount_paid - total_amount;
  const invoice_number = `INV-${Date.now()}`;

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();

    // Fetch loyalty and rating settings
    const [settingsRows]: any = await connection.execute('SELECT setting_key, setting_value FROM settings WHERE setting_key IN ("loyalty_points_per_amount", "rating_bronze_threshold", "rating_silver_threshold", "rating_gold_threshold", "rating_platinum_threshold")');
    const settings: any = {
      loyalty_points_per_amount: 100,
      rating_bronze_threshold: 10000,
      rating_silver_threshold: 50000,
      rating_gold_threshold: 100000,
      rating_platinum_threshold: 500000
    };
    for (const row of settingsRows) {
      if (!isNaN(parseFloat(row.setting_value))) {
        settings[row.setting_key] = parseFloat(row.setting_value);
      }
    }

    // Calculate earned points based on settings
    const points_earned = Math.floor(total_amount / (settings.loyalty_points_per_amount || 100));

    // 1. Create Sale Record
    const [saleResult]: any = await connection.execute(
      `INSERT INTO sales (
        invoice_number, customer_id, user_id, subtotal, discount, tax, 
        total_amount, payment_method, amount_paid, balance, status,
        loyalty_points_used, loyalty_points_earned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_number, customer_id || null, user_id, subtotal, discount || 0, tax || 0,
        total_amount, payment_method, amount_paid, balance > 0 ? 0 : balance, status || 'Completed',
        loyalty_points_used || 0, points_earned
      ]
    );

    const sale_id = saleResult.insertId;

    // Get default warehouse for POS
    const [warehouse]: any = await connection.execute('SELECT id FROM warehouses WHERE is_default = TRUE LIMIT 1');
    const warehouse_id = warehouse.length > 0 ? warehouse[0].id : 1;

    // 2. Insert Sale Items and Update Stock
    for (const item of items) {
      await connection.execute(
        `INSERT INTO sales_items (sale_id, product_id, quantity, unit_price, discount, subtotal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sale_id, item.product_id, item.quantity, item.unit_price, item.discount || 0, item.subtotal]
      );

      if (status === 'Completed') {
        if (!item.is_service) {
          await connection.execute(
            `UPDATE products SET stock = stock - ? WHERE id = ?`,
            [item.quantity, item.product_id]
          );

          // Fetch previous warehouse balance
          const [prevWs]: any = await connection.execute(
            'SELECT stock FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ? FOR UPDATE',
            [item.product_id, warehouse_id]
          );
          const previous_balance = prevWs.length > 0 ? prevWs[0].stock : 0;
          const current_balance = previous_balance - parseInt(item.quantity);

          // Update warehouse stock
          await connection.execute(
            `INSERT INTO warehouse_stock (product_id, warehouse_id, stock) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE stock = stock - ?`,
            [item.product_id, warehouse_id, -item.quantity, item.quantity]
          );

          // Insert into stock_ledger
          await connection.execute(
            `INSERT INTO stock_ledger 
             (product_id, warehouse_id, transaction_type, reference_id, qty_out, previous_balance, current_balance, user_id, notes) 
             VALUES (?, ?, 'POS Sale', ?, ?, ?, ?, ?, ?)`,
            [item.product_id, warehouse_id, invoice_number, item.quantity, previous_balance, current_balance, user_id, `Sold via POS`]
          );
        } else {
          // It's a service. Deduct linked materials if any.
          const [materials]: any = await connection.execute(
            'SELECT material_id, quantity FROM service_materials WHERE service_id = ?',
            [item.product_id]
          );
          
          for (const mat of materials) {
            const matQty = mat.quantity * item.quantity;
            
            await connection.execute(
              `UPDATE products SET stock = stock - ? WHERE id = ?`,
              [matQty, mat.material_id]
            );
            
            const [prevWs]: any = await connection.execute(
              'SELECT stock FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ? FOR UPDATE',
              [mat.material_id, warehouse_id]
            );
            const previous_balance = prevWs.length > 0 ? prevWs[0].stock : 0;
            const current_balance = previous_balance - matQty;
            
            await connection.execute(
              `INSERT INTO warehouse_stock (product_id, warehouse_id, stock) VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE stock = stock - ?`,
              [mat.material_id, warehouse_id, -matQty, matQty]
            );
            
            await connection.execute(
              `INSERT INTO stock_ledger 
               (product_id, warehouse_id, transaction_type, reference_id, qty_out, previous_balance, current_balance, user_id, notes) 
               VALUES (?, ?, 'Service Consumption', ?, ?, ?, ?, ?, ?)`,
              [mat.material_id, warehouse_id, invoice_number, matQty, previous_balance, current_balance, user_id, `Consumed for Service ID: ${item.product_id}`]
            );
          }
        }
      }
    }

    // 3. Update Customer Loyalty Points & Balance & Rating
    if (customer_id && status === 'Completed') {
      const netPoints = points_earned - (loyalty_points_used || 0);
      let updateSql = 'UPDATE customers SET loyalty_points = loyalty_points + ?, total_purchases = total_purchases + ?';
      let params: any[] = [netPoints, total_amount];

      if (payment_method === 'Credit' && balance < 0) {
        updateSql += ', outstanding_balance = outstanding_balance + ?';
        params.push(Math.abs(balance)); // balance is negative when amount_paid < total_amount
      }

      // Re-evaluate rating dynamically based on total_purchases
      updateSql += `, rating = CASE 
        WHEN total_purchases + ? >= ? THEN 'Platinum'
        WHEN total_purchases + ? >= ? THEN 'Gold'
        WHEN total_purchases + ? >= ? THEN 'Silver'
        WHEN total_purchases + ? >= ? THEN 'Bronze'
        ELSE 'Standard' END`;
      params.push(
        total_amount, settings.rating_platinum_threshold,
        total_amount, settings.rating_gold_threshold,
        total_amount, settings.rating_silver_threshold,
        total_amount, settings.rating_bronze_threshold
      );

      updateSql += ' WHERE id = ?';
      params.push(customer_id);

      await connection.execute(updateSql, params);
    }

    await connection.commit();
    res.status(201).json({ message: 'Sale created successfully', sale_id, invoice_number });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating sale:', error);
    res.status(500).json({ message: 'Server error while creating sale' });
  } finally {
    connection.release();
  }
};

export const getSales = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, cashier_id, customer_id, min_amount, max_amount } = req.query;

    let query = `
      SELECT s.*, u.full_name as cashier_name, c.name as customer_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (start_date) {
      query += ` AND s.created_at >= ?`;
      params.push(`${start_date} 00:00:00`);
    }
    if (end_date) {
      query += ` AND s.created_at <= ?`;
      params.push(`${end_date} 23:59:59`);
    }
    if (cashier_id) {
      query += ` AND s.user_id = ?`;
      params.push(cashier_id);
    }
    if (customer_id) {
      query += ` AND s.customer_id = ?`;
      params.push(customer_id);
    }
    if (min_amount) {
      query += ` AND s.total_amount >= ?`;
      params.push(min_amount);
    }
    if (max_amount) {
      query += ` AND s.total_amount <= ?`;
      params.push(max_amount);
    }

    query += ` ORDER BY s.created_at DESC LIMIT 500`;

    const [rows]: any = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSaleById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [sales]: any = await db.execute(`
      SELECT s.*, u.full_name as cashier_name, c.name as customer_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `, [id]);

    if (sales.length === 0) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const [items]: any = await db.execute(`
      SELECT si.*, p.name as product_name, p.barcode 
      FROM sales_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `, [id]);

    res.json({ ...sales[0], items });
  } catch (error) {
    console.error('Error fetching sale by id:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
