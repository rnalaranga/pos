import { Request, Response } from 'express';
import db from '../config/db';

export const getCurrentShift = async (req: any, res: Response) => {
  try {
    const user_id = req.user.id;
    const [shifts]: any = await db.execute(
      'SELECT * FROM shifts WHERE user_id = ? AND status = "Open" ORDER BY id DESC LIMIT 1',
      [user_id]
    );

    if (shifts.length > 0) {
      res.json(shifts[0]);
    } else {
      res.json(null);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const openShift = async (req: any, res: Response) => {
  const { opening_balance } = req.body;
  const user_id = req.user.id;
  try {
    const [existing]: any = await db.execute(
      'SELECT * FROM shifts WHERE user_id = ? AND status = "Open"',
      [user_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'A shift is already open' });
    }

    const [result]: any = await db.execute(
      'INSERT INTO shifts (user_id, opening_balance, status, opening_time) VALUES (?, ?, "Open", NOW())',
      [user_id, opening_balance || 0]
    );

    const [newShift]: any = await db.execute('SELECT * FROM shifts WHERE id = ?', [result.insertId]);
    res.status(201).json(newShift[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const closeShift = async (req: any, res: Response) => {
  const { id } = req.params;
  const { actual_cash } = req.body;
  const user_id = req.user.id;

  try {
    const [shifts]: any = await db.execute('SELECT * FROM shifts WHERE id = ? AND user_id = ?', [id, user_id]);
    if (shifts.length === 0) {
      return res.status(404).json({ message: 'Shift not found' });
    }

    const shift = shifts[0];
    if (shift.status === 'Closed') {
      return res.status(400).json({ message: 'Shift is already closed' });
    }

    // Calculate totals from sales between opening_time and NOW
    const [sales]: any = await db.execute(
      `SELECT payment_method, SUM(amount_paid) as total 
       FROM sales 
       WHERE user_id = ? AND created_at >= ? 
       GROUP BY payment_method`,
      [user_id, shift.opening_time]
    );

    let expected_cash = parseFloat(shift.opening_balance);
    let expected_card = 0;
    let expected_credit = 0;

    for (const row of sales) {
      const total = parseFloat(row.total);
      if (row.payment_method === 'Cash') expected_cash += total;
      else if (row.payment_method === 'Card') expected_card += total;
      else if (row.payment_method === 'Credit') expected_credit += total;
    }

    await db.execute(
      `UPDATE shifts 
       SET status = 'Closed', closing_time = NOW(), expected_cash = ?, expected_card = ?, expected_credit = ?, actual_cash = ? 
       WHERE id = ?`,
      [expected_cash, expected_card, expected_credit, actual_cash !== undefined ? actual_cash : null, id]
    );

    const [updatedShift]: any = await db.execute('SELECT * FROM shifts WHERE id = ?', [id]);
    res.json(updatedShift[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getShiftSummary = async (req: any, res: Response) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const [shifts]: any = await db.execute('SELECT * FROM shifts WHERE id = ? AND user_id = ?', [id, user_id]);
    if (shifts.length === 0) return res.status(404).json({ message: 'Shift not found' });
    const shift = shifts[0];

    const [sales]: any = await db.execute(
      `SELECT payment_method, SUM(amount_paid) as total 
       FROM sales 
       WHERE user_id = ? AND created_at >= ? AND created_at <= COALESCE(?, NOW())
       GROUP BY payment_method`,
      [user_id, shift.opening_time, shift.closing_time]
    );

    const [[expenses]]: any = await db.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses 
       WHERE user_id = ? AND created_at >= ? AND created_at <= COALESCE(?, NOW())`,
      [user_id, shift.opening_time, shift.closing_time]
    );

    const [[deposits]]: any = await db.execute(
      `SELECT COALESCE(SUM(amount), 0) as total FROM bank_deposits 
       WHERE user_id = ? AND created_at >= ? AND created_at <= COALESCE(?, NOW())`,
      [user_id, shift.opening_time, shift.closing_time]
    );

    let expected_cash = parseFloat(shift.opening_balance);
    let expected_card = 0;
    let expected_credit = 0;

    for (const row of sales) {
      const total = parseFloat(row.total);
      if (row.payment_method === 'Cash') expected_cash += total;
      else if (row.payment_method === 'Card') expected_card += total;
      else if (row.payment_method === 'Credit') expected_credit += total;
    }

    const total_expenses = parseFloat(expenses.total || 0);
    const total_deposits = parseFloat(deposits.total || 0);

    expected_cash -= total_expenses;
    expected_cash -= total_deposits;

    res.json({
      ...shift,
      total_expenses,
      total_deposits,
      current_expected_cash: expected_cash,
      current_expected_card: expected_card,
      current_expected_credit: expected_credit
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
