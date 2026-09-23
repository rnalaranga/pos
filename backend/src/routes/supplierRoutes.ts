import express from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, addSupplierPayment, getSupplierLedger } from '../controllers/supplierController';

const router = express.Router();

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, createSupplier);

router.route('/:id')
  .put(protect, updateSupplier)
  .delete(protect, adminOnly, deleteSupplier);

router.post('/:id/payments', protect, addSupplierPayment);
router.get('/:id/ledger', protect, getSupplierLedger);

export default router;
