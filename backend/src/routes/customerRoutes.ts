import express from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, addCustomerPayment, getCustomerLedger, getCustomerAnalytics } from '../controllers/customerController';

const router = express.Router();

router.post('/register', createCustomer);

router.route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

router.route('/analytics')
  .get(protect, getCustomerAnalytics);

router.route('/:id')
  .put(protect, updateCustomer)
  .delete(protect, adminOnly, deleteCustomer);

router.post('/:id/payments', protect, addCustomerPayment);
router.get('/:id/ledger', protect, getCustomerLedger);

export default router;
