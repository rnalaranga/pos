import express from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware';
import { createSale, getSales, getSaleById, updatePaymentMethod } from '../controllers/saleController';

const router = express.Router();

router.route('/')
  .post(protect, createSale)
  .get(protect, getSales);

router.route('/:id')
  .get(protect, getSaleById);

router.route('/:id/payment-method')
  .put(protect, adminOnly, updatePaymentMethod);

export default router;
