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
      'INSERT INTO customers (name, phone, email, address, customer_type, credit_limit, total_purchases, rating) VALUES (?, ?, ?, ?, ?, ?, 0.00, ?)',
      [name, phone || null, email || null, address || null, customer_type || 'Walk-in', credit_limit || 0, 'Standard']
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

export const getCustomerAnalytics = async (req: Request, res: Response) => {
  try {
    // 1. Get rating distribution
    const [ratingCounts]: any = await db.execute(`
      SELECT rating, COUNT(*) as count 
      FROM customers 
      GROUP BY rating
    `);

    // 2. Get top 10 customers by total purchases
    const [topCustomers]: any = await db.execute(`
      SELECT id, name, total_purchases, loyalty_points, rating 
      FROM customers 
      ORDER BY total_purchases DESC 
      LIMIT 10
    `);

    // 3. Get aggregate stats
    const [[stats]]: any = await db.execute(`
      SELECT 
        COUNT(*) as totalCustomers,
        SUM(loyalty_points) as totalPoints,
        SUM(outstanding_balance) as totalOutstanding
      FROM customers
    `);

    // 4. Get recent customer activity (sales)
    const [recentActivity]: any = await db.execute(`
      SELECT 
        s.invoice_number, 
        s.created_at, 
        s.total_amount, 
        s.loyalty_points_earned, 
        s.loyalty_points_used,
        c.name as customer_name
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      ORDER BY s.created_at DESC
      LIMIT 10
    `);

    // Format rating counts for Recharts PieChart (name, value)
    const ratingDistribution = ratingCounts.map((r: any) => ({
      name: r.rating || 'Standard',
      value: r.count
    }));

    res.json({
      ratingDistribution,
      topCustomers,
      stats: {
        totalCustomers: stats.totalCustomers || 0,
        totalPoints: stats.totalPoints || 0,
        totalOutstanding: stats.totalOutstanding || 0
      },
      recentActivity
    });
  } catch (error) {
    console.error('Error fetching customer analytics:', error);
    res.status(500).json({ message: 'Server error while fetching analytics' });
  }
};
