import express from 'express';
import { protect, managerOrAdmin } from '../middlewares/authMiddleware';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/productController';

const router = express.Router();

router.route('/')
  .get(protect, getProducts)
  .post(protect, managerOrAdmin, createProduct);

router.route('/:id')
  .put(protect, managerOrAdmin, updateProduct)
  .delete(protect, managerOrAdmin, deleteProduct);

export default router;
