import { Request, Response } from 'express';
import db from '../config/db';

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.execute('SELECT * FROM suppliers ORDER BY company_name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  const { company_name, contact_person, phone, email, address } = req.body;
  try {
    const [result]: any = await db.execute(
      'INSERT INTO suppliers (company_name, contact_person, phone, email, address) VALUES (?, ?, ?, ?, ?)',
      [company_name, contact_person || null, phone || null, email || null, address || null]
    );
    res.status(201).json({ id: result.insertId, company_name });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { company_name, contact_person, phone, email, address } = req.body;
  try {
    await db.execute(
      'UPDATE suppliers SET company_name = ?, contact_person = ?, phone = ?, email = ?, address = ? WHERE id = ?',
      [company_name, contact_person, phone, email, address, id]
    );
    res.json({ message: 'Supplier updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [products]: any = await db.execute('SELECT id FROM products WHERE supplier_id = ? LIMIT 1', [id]);
    if (products.length > 0) {
      return res.status(400).json({ message: 'Cannot delete supplier with associated products.' });
    }
    await db.execute('DELETE FROM suppliers WHERE id = ?', [id]);
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addSupplierPayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, payment_method, reference_number, notes, grn_id } = req.body;
  try {
    await db.execute('START TRANSACTION');
    
    await db.execute(
      'INSERT INTO supplier_payments (supplier_id, payment_method, amount, reference_number, notes, grn_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, payment_method, amount, reference_number || null, notes || null, grn_id || null]
    );

    if (grn_id) {
      await db.execute(
        `UPDATE grn SET paid_amount = paid_amount + ?, payment_status = CASE WHEN (paid_amount + ?) >= total_amount THEN 'Paid' ELSE 'Partial' END WHERE id = ?`,
        [amount, amount, grn_id]
      );
    }

    await db.execute(
      'UPDATE suppliers SET outstanding_balance = outstanding_balance - ? WHERE id = ?',
      [amount, id]
    );

    await db.execute('COMMIT');
    res.status(201).json({ message: 'Payment recorded successfully' });
  } catch (error) {
    await db.execute('ROLLBACK');
    res.status(500).json({ message: 'Server error' });
  }
};

export const getSupplierLedger = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows]: any = await db.execute(`
      SELECT 
        'GRN' as type, 
        reference_number as ref, 
        total_amount as amount, 
        created_at as date,
        notes,
        id as grn_id,
        reference_number as grn_ref
      FROM grn WHERE supplier_id = ? AND status = 'Completed'
      UNION ALL
      SELECT 
        'Payment' as type, 
        p.reference_number as ref, 
        p.amount, 
        p.created_at as date,
        p.notes,
        p.grn_id,
        g.reference_number as grn_ref
      FROM supplier_payments p
      LEFT JOIN grn g ON p.grn_id = g.id
      WHERE p.supplier_id = ?
      ORDER BY date ASC
    `, [id, id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
