import { Request, Response } from 'express';
import db from '../config/db';

export const getProducts = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.name ASC
    `;
    const [rows]: any = await db.execute(query);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const { 
    barcode, sku, name, category_id, supplier_id, unit, 
    purchase_price, selling_price, wholesale_price, 
    stock, reorder_level, is_service, status 
  } = req.body;
  
  try {
    const [result]: any = await db.execute(
      `INSERT INTO products (
        barcode, sku, name, category_id, supplier_id, unit, 
        purchase_price, selling_price, wholesale_price, 
        stock, reorder_level, is_service, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        barcode || null, sku || null, name, category_id || null, supplier_id || null, unit || 'pcs',
        purchase_price || 0, selling_price || 0, wholesale_price || 0,
        stock || 0, reorder_level || 5, is_service || false, status || 'Active'
      ]
    );
    res.status(201).json({ id: result.insertId, name, barcode, sku });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Barcode or SKU already exists' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    barcode, sku, name, category_id, supplier_id, unit, 
    purchase_price, selling_price, wholesale_price, 
    stock, reorder_level, is_service, status 
  } = req.body;

  try {
    await db.execute(
      `UPDATE products SET 
        barcode = ?, sku = ?, name = ?, category_id = ?, supplier_id = COALESCE(?, supplier_id), unit = ?, 
        purchase_price = ?, selling_price = ?, wholesale_price = ?, 
        stock = ?, reorder_level = ?, is_service = ?, status = COALESCE(?, status)
      WHERE id = ?`,
      [
        barcode || null, sku || null, name, category_id || null, supplier_id || null, unit || 'pcs',
        purchase_price, selling_price, wholesale_price,
        stock, reorder_level, is_service, status || null, id
      ]
    );
    res.json({ message: 'Product updated successfully' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Barcode or SKU already exists' });
    }
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      await db.execute('UPDATE products SET status = "Inactive" WHERE id = ?', [id]);
      return res.json({ message: 'Product marked as inactive because it has associated records' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};
