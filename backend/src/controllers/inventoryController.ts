import { Request, Response } from 'express';
import db from '../config/db';

export const getInventoryHistory = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.execute(`
      SELECT ia.*, p.name as product_name, p.sku, u.full_name as user_name
      FROM inventory_adjustments ia
      JOIN products p ON ia.product_id = p.id
      JOIN users u ON ia.user_id = u.id
      ORDER BY ia.created_at DESC
      LIMIT 100
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const adjustStock = async (req: any, res: Response) => {
  const { product_id, warehouse_id, adjustment_type, quantity, reason } = req.body;
  const user_id = req.user.id;
  
  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be greater than zero' });
  }

  // Fallback to default warehouse if none provided (e.g., from old UI)
  let wh_id = warehouse_id;
  if (!wh_id) {
    const [warehouse]: any = await db.execute('SELECT id FROM warehouses WHERE is_default = TRUE LIMIT 1');
    wh_id = warehouse.length > 0 ? warehouse[0].id : 1;
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch previous warehouse stock
    const [prevWs]: any = await connection.execute(
      'SELECT stock FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ? FOR UPDATE',
      [product_id, wh_id]
    );
    const previous_balance = prevWs.length > 0 ? prevWs[0].stock : 0;
    
    let current_balance = previous_balance;
    let qty_in = 0;
    let qty_out = 0;

    // 2. Determine changes
    if (adjustment_type === 'Addition') {
      current_balance = previous_balance + quantity;
      qty_in = quantity;
    } else if (adjustment_type === 'Reduction' || adjustment_type === 'Damage') {
      if (previous_balance < quantity) {
        throw new Error('Insufficient stock in warehouse for reduction');
      }
      current_balance = previous_balance - quantity;
      qty_out = quantity;
    } else {
      throw new Error('Invalid adjustment type');
    }

    // 3. Update global products stock (for backward compatibility / global total)
    let updateQuery = adjustment_type === 'Addition' 
      ? 'UPDATE products SET stock = stock + ? WHERE id = ?'
      : 'UPDATE products SET stock = stock - ? WHERE id = ?';
    await connection.execute(updateQuery, [quantity, product_id]);

    // 4. Update warehouse_stock
    await connection.execute(
      `INSERT INTO warehouse_stock (product_id, warehouse_id, stock) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE stock = ?`,
      [product_id, wh_id, current_balance, current_balance]
    );

    // 5. Insert into stock_ledger
    await connection.execute(
      `INSERT INTO stock_ledger 
       (product_id, warehouse_id, transaction_type, reference_id, qty_in, qty_out, previous_balance, current_balance, user_id, notes) 
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
      [product_id, wh_id, adjustment_type, qty_in, qty_out, previous_balance, current_balance, user_id, reason || null]
    );

    // 6. Keep old inventory_adjustments for legacy (optional)
    await connection.execute(
      'INSERT INTO inventory_adjustments (product_id, user_id, adjustment_type, quantity, reason) VALUES (?, ?, ?, ?, ?)',
      [product_id, user_id, adjustment_type, quantity, reason || null]
    );

    await connection.commit();
    res.status(201).json({ message: 'Stock adjusted successfully' });
  } catch (error: any) {
    await connection.rollback();
    res.status(400).json({ message: error.message || 'Server error' });
  } finally {
    connection.release();
  }
};

export const transferStock = async (req: any, res: Response) => {
  const { product_id, from_warehouse_id, to_warehouse_id, quantity, reason } = req.body;
  const user_id = req.user.id;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be greater than zero' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Fetch Source Warehouse Stock
    const [sourceWs]: any = await connection.execute(
      'SELECT stock FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ? FOR UPDATE',
      [product_id, from_warehouse_id]
    );
    const sourcePrev = sourceWs.length > 0 ? sourceWs[0].stock : 0;

    if (sourcePrev < quantity) {
      throw new Error('Insufficient stock in source warehouse');
    }

    const sourceCurr = sourcePrev - quantity;

    // 2. Fetch Dest Warehouse Stock
    const [destWs]: any = await connection.execute(
      'SELECT stock FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ? FOR UPDATE',
      [product_id, to_warehouse_id]
    );
    const destPrev = destWs.length > 0 ? destWs[0].stock : 0;
    const destCurr = destPrev + quantity;

    // 3. Update Source Stock
    await connection.execute(
      'UPDATE warehouse_stock SET stock = ? WHERE product_id = ? AND warehouse_id = ?',
      [sourceCurr, product_id, from_warehouse_id]
    );

    // 4. Update Dest Stock
    await connection.execute(
      `INSERT INTO warehouse_stock (product_id, warehouse_id, stock) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE stock = ?`,
      [product_id, to_warehouse_id, destCurr, destCurr]
    );

    // 5. Log Out from Source
    await connection.execute(
      `INSERT INTO stock_ledger 
       (product_id, warehouse_id, transaction_type, qty_out, previous_balance, current_balance, user_id, notes) 
       VALUES (?, ?, 'Transfer Out', ?, ?, ?, ?, ?)`,
      [product_id, from_warehouse_id, quantity, sourcePrev, sourceCurr, user_id, reason || `Transferred to Warehouse ${to_warehouse_id}`]
    );

    // 6. Log In to Dest
    await connection.execute(
      `INSERT INTO stock_ledger 
       (product_id, warehouse_id, transaction_type, qty_in, previous_balance, current_balance, user_id, notes) 
       VALUES (?, ?, 'Transfer In', ?, ?, ?, ?, ?)`,
      [product_id, to_warehouse_id, quantity, destPrev, destCurr, user_id, reason || `Transferred from Warehouse ${from_warehouse_id}`]
    );

    await connection.commit();
    res.status(201).json({ message: 'Stock transferred successfully' });
  } catch (error: any) {
    await connection.rollback();
    res.status(400).json({ message: error.message || 'Server error' });
  } finally {
    connection.release();
  }
};
