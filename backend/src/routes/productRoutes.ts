import express from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware';
import { getProducts, createProduct, updateProduct, deleteProduct, downloadProductTemplate, importProducts, exportProducts } from '../controllers/productController';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.route('/')
  .get(protect, getProducts)
  .post(protect, createProduct);

router.get('/export', protect, exportProducts);
router.get('/template/download', protect, downloadProductTemplate);
router.post('/import', protect, upload.single('file'), importProducts);

router.route('/:id')
  .put(protect, updateProduct)
  .delete(protect, adminOnly, deleteProduct);

export default router;
