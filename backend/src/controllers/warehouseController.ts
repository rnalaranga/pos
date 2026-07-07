import { Request, Response } from 'express';
import db from '../config/db';

export const getWarehouses = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.execute('SELECT * FROM warehouses ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createWarehouse = async (req: Request, res: Response) => {
  const { name, location, is_default, status } = req.body;
  try {
    const [result]: any = await db.execute(
      'INSERT INTO warehouses (name, location, is_default, status) VALUES (?, ?, ?, ?)',
      [name, location || null, is_default ? 1 : 0, status || 'Active']
    );
    
    // If this is default, set others to not default
    if (is_default) {
      await db.execute('UPDATE warehouses SET is_default = 0 WHERE id != ?', [result.insertId]);
    }
    
    // Auto-create warehouse_stock records for all products
    await db.execute('INSERT IGNORE INTO warehouse_stock (product_id, warehouse_id, stock) SELECT id, ?, 0 FROM products', [result.insertId]);
    
    res.status(201).json({ id: result.insertId, message: 'Warehouse created successfully' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Warehouse name already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateWarehouse = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, location, is_default, status } = req.body;
  try {
    await db.execute(
      'UPDATE warehouses SET name = ?, location = ?, is_default = ?, status = ? WHERE id = ?',
      [name, location || null, is_default ? 1 : 0, status || 'Active', id]
    );
    
    if (is_default) {
      await db.execute('UPDATE warehouses SET is_default = 0 WHERE id != ?', [id]);
    }
    
    res.json({ message: 'Warehouse updated successfully' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Warehouse name already exists' });
    res.status(500).json({ message: 'Server error' });
  }
};

export const getStockLedger = async (req: Request, res: Response) => {
  const { product_id, warehouse_id } = req.query;
  try {
    let query = `
      SELECT sl.*, u.username as user, w.name as warehouse, p.name as product
      FROM stock_ledger sl
      LEFT JOIN users u ON sl.user_id = u.id
      JOIN warehouses w ON sl.warehouse_id = w.id
      JOIN products p ON sl.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (product_id) {
      query += ' AND sl.product_id = ?';
      params.push(product_id);
    }
    if (warehouse_id) {
      query += ' AND sl.warehouse_id = ?';
      params.push(warehouse_id);
    }
    
    query += ' ORDER BY sl.created_at DESC, sl.id DESC';
    
    const [rows]: any = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getWarehouseStock = async (req: Request, res: Response) => {
  const { warehouse_id } = req.query;
  try {
    let query = `
      SELECT ws.*, p.name, p.sku, p.barcode, p.purchase_price, p.reorder_level, c.name as category, w.name as warehouse
      FROM warehouse_stock ws
      JOIN products p ON ws.product_id = p.id
      JOIN warehouses w ON ws.warehouse_id = w.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (warehouse_id) {
      query += ' AND ws.warehouse_id = ?';
      params.push(warehouse_id);
    }
    
    const [rows]: any = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
