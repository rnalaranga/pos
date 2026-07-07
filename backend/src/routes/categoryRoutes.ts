import express from 'express';
import { protect, managerOrAdmin } from '../middlewares/authMiddleware';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';

const router = express.Router();

router.route('/')
  .get(protect, getCategories)
  .post(protect, managerOrAdmin, createCategory);

router.route('/:id')
  .put(protect, managerOrAdmin, updateCategory)
  .delete(protect, managerOrAdmin, deleteCategory);

export default router;
