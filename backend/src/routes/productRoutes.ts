import express from 'express';
import { protect, managerOrAdmin } from '../middlewares/authMiddleware';
import { getProducts, createProduct, updateProduct, deleteProduct, downloadProductTemplate, importProducts, exportProducts } from '../controllers/productController';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.route('/')
  .get(protect, getProducts)
  .post(protect, managerOrAdmin, createProduct);

router.get('/export', protect, exportProducts);
router.get('/template/download', protect, downloadProductTemplate);
router.post('/import', protect, managerOrAdmin, upload.single('file'), importProducts);

router.route('/:id')
  .put(protect, managerOrAdmin, updateProduct)
  .delete(protect, managerOrAdmin, deleteProduct);

export default router;
