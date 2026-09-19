import express from 'express';
import { protect, adminOnly, managerOrAdmin } from '../middlewares/authMiddleware';
import { 
  getExpenses, createExpense, deleteExpense,
  getBankDeposits, createBankDeposit, deleteBankDeposit 
} from '../controllers/financeController';

const router = express.Router();

// Expenses
router.route('/expenses')
  .get(protect, managerOrAdmin, getExpenses)
  .post(protect, managerOrAdmin, createExpense);

router.route('/expenses/:id')
  .delete(protect, adminOnly, deleteExpense);

// Bank Deposits
router.route('/bank-deposits')
  .get(protect, managerOrAdmin, getBankDeposits)
  .post(protect, managerOrAdmin, createBankDeposit);

router.route('/bank-deposits/:id')
  .delete(protect, adminOnly, deleteBankDeposit);

export default router;
