import { Request, Response } from 'express';
import db from '../config/db';

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.execute('SELECT * FROM customers ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  const { name, phone, email, address, customer_type, credit_limit } = req.body;
  try {
    const [result]: any = await db.execute(
      'INSERT INTO customers (name, phone, email, address, customer_type, credit_limit) VALUES (?, ?, ?, ?, ?, ?)',
      [name, phone || null, email || null, address || null, customer_type || 'Walk-in', credit_limit || 0]
    );
    res.status(201).json({ id: result.insertId, name });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, email, address, customer_type, credit_limit } = req.body;
  try {
    await db.execute(
      'UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, customer_type = ?, credit_limit = ? WHERE id = ?',
      [name, phone, email, address, customer_type, credit_limit, id]
    );
    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [sales]: any = await db.execute('SELECT id FROM sales WHERE customer_id = ? LIMIT 1', [id]);
    if (sales.length > 0) {
      return res.status(400).json({ message: 'Cannot delete customer with associated sales.' });
    }
    await db.execute('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addCustomerPayment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, payment_method, reference_number, notes } = req.body;
  try {
    await db.execute('START TRANSACTION');
    
    await db.execute(
      'INSERT INTO customer_payments (customer_id, payment_method, amount, reference_number, notes) VALUES (?, ?, ?, ?, ?)',
      [id, payment_method, amount, reference_number || null, notes || null]
    );

    await db.execute(
      'UPDATE customers SET outstanding_balance = outstanding_balance - ? WHERE id = ?',
      [amount, id]
    );

    await db.execute('COMMIT');
    res.status(201).json({ message: 'Payment recorded successfully' });
  } catch (error) {
    await db.execute('ROLLBACK');
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCustomerLedger = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [rows]: any = await db.execute(`
      SELECT 
        'Invoice' as type, 
        invoice_number as ref, 
        total_amount as amount, 
        created_at as date,
        payment_method as notes
      FROM sales WHERE customer_id = ? AND status = 'Completed' AND payment_method = 'Credit'
      UNION ALL
      SELECT 
        'Payment' as type, 
        reference_number as ref, 
        amount, 
        created_at as date,
        notes
      FROM customer_payments WHERE customer_id = ?
      ORDER BY date ASC
    `, [id, id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
