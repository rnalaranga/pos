import { Request, Response } from 'express';
import db from '../config/db';

// EXPENSES
export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT e.*, u.full_name as user_name 
      FROM expenses e 
      JOIN users u ON e.user_id = u.id 
    `;
    let params: any[] = [];
    
    if (startDate && endDate) {
      query += ` WHERE e.expense_date BETWEEN ? AND ? `;
      params.push(startDate, endDate);
    }
    
    query += ` ORDER BY e.expense_date DESC, e.created_at DESC`;

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Get Expenses Error:", error);
    res.status(500).json({ message: 'Server error retrieving expenses' });
  }
};

export const createExpense = async (req: any, res: Response) => {
  try {
    const { category, amount, description, expense_date } = req.body;
    const userId = req.user.id;

    await db.execute(
      `INSERT INTO expenses (user_id, category, amount, description, expense_date) VALUES (?, ?, ?, ?, ?)`,
      [userId, category, amount, description, expense_date]
    );

    res.status(201).json({ message: 'Expense added successfully' });
  } catch (error) {
    console.error("Create Expense Error:", error);
    res.status(500).json({ message: 'Server error creating expense' });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.execute(`DELETE FROM expenses WHERE id = ?`, [id]);
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting expense' });
  }
};

// BANK DEPOSITS
export const getBankDeposits = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    let query = `
      SELECT b.*, u.full_name as user_name 
      FROM bank_deposits b 
      JOIN users u ON b.user_id = u.id 
    `;
    let params: any[] = [];
    
    if (startDate && endDate) {
      query += ` WHERE b.deposit_date BETWEEN ? AND ? `;
      params.push(startDate, endDate);
    }
    
    query += ` ORDER BY b.deposit_date DESC, b.created_at DESC`;

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Get Deposits Error:", error);
    res.status(500).json({ message: 'Server error retrieving deposits' });
  }
};

export const createBankDeposit = async (req: any, res: Response) => {
  try {
    const { bank_name, reference_number, amount, deposit_date } = req.body;
    const userId = req.user.id;

    await db.execute(
      `INSERT INTO bank_deposits (user_id, bank_name, reference_number, amount, deposit_date) VALUES (?, ?, ?, ?, ?)`,
      [userId, bank_name, reference_number, amount, deposit_date]
    );

    res.status(201).json({ message: 'Deposit recorded successfully' });
  } catch (error) {
    console.error("Create Deposit Error:", error);
    res.status(500).json({ message: 'Server error recording deposit' });
  }
};

export const deleteBankDeposit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.execute(`DELETE FROM bank_deposits WHERE id = ?`, [id]);
    res.json({ message: 'Deposit deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting deposit' });
  }
};
