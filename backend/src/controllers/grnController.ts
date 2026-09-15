import { Request, Response } from 'express';
import db from '../config/db';

export const getGRNs = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.execute(`
      SELECT g.*, s.company_name as supplier_name, u.full_name as user_name
      FROM grn g
      JOIN suppliers s ON g.supplier_id = s.id
      JOIN users u ON g.user_id = u.id
      ORDER BY g.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createGRN = async (req: any, res: Response) => {
  const { supplier_id, reference_number, notes, items, total_amount } = req.body;
  const user_id = req.user.id;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'GRN must have at least one item' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Create GRN Record
    const [grnResult]: any = await connection.execute(
      `INSERT INTO grn (reference_number, supplier_id, user_id, total_amount, status, notes)
       VALUES (?, ?, ?, ?, 'Completed', ?)`,
      [reference_number, supplier_id, user_id, total_amount, notes || null]
    );

    const grn_id = grnResult.insertId;

    // Get default warehouse for now (until UI supports warehouse selection)
    const [warehouse]: any = await connection.execute('SELECT id FROM warehouses WHERE is_default = TRUE LIMIT 1');
    const warehouse_id = warehouse.length > 0 ? warehouse[0].id : 1;

    // 2. Insert GRN Items and Update Stock and Purchase Prices
    for (const item of items) {
      await connection.execute(
        `INSERT INTO grn_items (grn_id, product_id, quantity, purchase_price, batch_number, expiry_date, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          grn_id, item.product_id, item.quantity, item.purchase_price, 
          item.batch_number || null, item.expiry_date || null, item.total
        ]
      );

      // Update global stock and purchase price
      await connection.execute(
        `UPDATE products SET stock = stock + ?, purchase_price = ? WHERE id = ?`,
        [item.quantity, item.purchase_price, item.product_id]
      );

      // Fetch previous warehouse balance
      const [prevWs]: any = await connection.execute(
        'SELECT stock FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?',
        [item.product_id, warehouse_id]
      );
      const previous_balance = prevWs.length > 0 ? prevWs[0].stock : 0;
      const current_balance = previous_balance + parseInt(item.quantity);

      // Update warehouse stock
      await connection.execute(
        `INSERT INTO warehouse_stock (product_id, warehouse_id, stock) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE stock = stock + ?`,
        [item.product_id, warehouse_id, item.quantity, item.quantity]
      );

      // Insert into stock_ledger
      await connection.execute(
        `INSERT INTO stock_ledger 
         (product_id, warehouse_id, user_id, type, quantity, reason) 
         VALUES (?, ?, ?, 'IN', ?, ?)`,
        [item.product_id, warehouse_id, grn_id, item.quantity, previous_balance, current_balance, user_id, `GRN Ref: ${reference_number}`]
      );
    }

    // 3. Update Supplier Outstanding Balance
    await connection.execute(
      `UPDATE suppliers SET outstanding_balance = outstanding_balance + ? WHERE id = ?`,
      [total_amount, supplier_id]
    );

    await connection.commit();
    res.status(201).json({ message: 'GRN created successfully', grn_id });

  } catch (error: any) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Reference number already exists' });
    }
    console.error('GRN Error:', error);
    res.status(500).json({ message: 'Server error while creating GRN' });
  } finally {
    connection.release();
  }
};

export const getGRNById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [grn]: any = await db.execute(`
      SELECT g.*, s.company_name as supplier_name, u.full_name as user_name
      FROM grn g
      JOIN suppliers s ON g.supplier_id = s.id
      JOIN users u ON g.user_id = u.id
      WHERE g.id = ?
    `, [id]);

    if (grn.length === 0) {
      return res.status(404).json({ message: 'GRN not found' });
    }

    const [items]: any = await db.execute(`
      SELECT gi.*, p.name as product_name, p.sku 
      FROM grn_items gi
      JOIN products p ON gi.product_id = p.id
      WHERE gi.grn_id = ?
    `, [id]);

    res.json({ ...grn[0], items });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
