import express from 'express';
import { protect, managerOrAdmin } from '../middlewares/authMiddleware';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, addSupplierPayment, getSupplierLedger } from '../controllers/supplierController';

const router = express.Router();

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, managerOrAdmin, createSupplier);

router.route('/:id')
  .put(protect, managerOrAdmin, updateSupplier)
  .delete(protect, managerOrAdmin, deleteSupplier);

router.post('/:id/payments', protect, managerOrAdmin, addSupplierPayment);
router.get('/:id/ledger', protect, getSupplierLedger);

export default router;
