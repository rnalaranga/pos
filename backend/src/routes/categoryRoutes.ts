import express from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';

const router = express.Router();

router.route('/')
  .get(protect, getCategories)
  .post(protect, createCategory);

router.route('/:id')
  .put(protect, updateCategory)
  .delete(protect, adminOnly, deleteCategory);

export default router;
