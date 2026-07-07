import { Request, Response } from 'express';
import db from '../config/db';

export const getCategories = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.execute('SELECT * FROM categories ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  const { name, description, icon, color_code } = req.body;
  try {
    const [result]: any = await db.execute(
      'INSERT INTO categories (name, description, icon, color_code) VALUES (?, ?, ?, ?)',
      [name, description || null, icon || null, color_code || null]
    );
    res.status(201).json({ id: result.insertId, name, description, icon, color_code });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Category name already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, icon, color_code } = req.body;
  try {
    await db.execute(
      'UPDATE categories SET name = ?, description = ?, icon = ?, color_code = ? WHERE id = ?',
      [name, description, icon, color_code, id]
    );
    res.json({ message: 'Category updated successfully' });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Category name already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Check if products exist in this category
    const [products]: any = await db.execute('SELECT id FROM products WHERE category_id = ? LIMIT 1', [id]);
    if (products.length > 0) {
      return res.status(400).json({ message: 'Cannot delete category with associated products. Reassign them first.' });
    }
    await db.execute('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
