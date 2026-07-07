import express from 'express';
import { protect, managerOrAdmin } from '../middlewares/authMiddleware';
import { createSale, getSales, getSaleById } from '../controllers/saleController';

const router = express.Router();

router.route('/')
  .post(protect, createSale)
  .get(protect, getSales);

router.route('/:id')
  .get(protect, getSaleById);

export default router;
