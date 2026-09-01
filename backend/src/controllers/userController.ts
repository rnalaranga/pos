import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/db';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.execute('SELECT id, username, full_name, role, status, created_at, modules FROM users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  const { username, password, full_name, role, modules } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const modulesJson = JSON.stringify(modules || []);

    const [result]: any = await db.execute(
      'INSERT INTO users (username, password, full_name, role, modules) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, full_name, role || 'Cashier', modulesJson]
    );
    res.status(201).json({ id: result.insertId, username, full_name, role, modules });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { full_name, role, status, password, modules } = req.body;
  try {
    const modulesJson = JSON.stringify(modules || []);
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await db.execute(
        'UPDATE users SET full_name = ?, role = ?, status = ?, password = ?, modules = ? WHERE id = ?',
        [full_name, role, status, hashedPassword, modulesJson, id]
      );
    } else {
      await db.execute(
        'UPDATE users SET full_name = ?, role = ?, status = ?, modules = ? WHERE id = ?',
        [full_name, role, status, modulesJson, id]
      );
    }
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    // If user has created sales, we shouldn't delete them. We should set status to inactive instead.
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      await db.execute('UPDATE users SET status = "Inactive" WHERE id = ?', [id]);
      return res.json({ message: 'User marked as inactive because they have associated records' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};
