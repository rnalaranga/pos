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
        loyalty_points_used || 0, loyalty_points_earned || 0
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

      // Only deduct stock if the sale is completed and it's not a service
      if (status === 'Completed' && !item.is_service) {
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
      }
    }

    // 3. Update Customer Loyalty Points & Balance
    if (customer_id && status === 'Completed') {
      const netPoints = (loyalty_points_earned || 0) - (loyalty_points_used || 0);
      let updateSql = 'UPDATE customers SET loyalty_points = loyalty_points + ?';
      let params: any[] = [netPoints];

      if (payment_method === 'Credit' && balance < 0) {
        updateSql += ', outstanding_balance = outstanding_balance + ?';
        params.push(Math.abs(balance)); // balance is negative when amount_paid < total_amount
      }

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
    const [rows]: any = await db.execute(`
      SELECT s.*, u.full_name as cashier_name, c.name as customer_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (error) {
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
    res.status(500).json({ message: 'Server error' });
  }
};
