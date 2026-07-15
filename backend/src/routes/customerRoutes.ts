import express from 'express';
import { protect, managerOrAdmin } from '../middlewares/authMiddleware';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, addCustomerPayment, getCustomerLedger, getCustomerAnalytics } from '../controllers/customerController';

const router = express.Router();

router.route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

router.route('/analytics')
  .get(protect, getCustomerAnalytics);

router.route('/:id')
  .put(protect, managerOrAdmin, updateCustomer)
  .delete(protect, managerOrAdmin, deleteCustomer);

router.post('/:id/payments', protect, addCustomerPayment);
router.get('/:id/ledger', protect, getCustomerLedger);

export default router;
