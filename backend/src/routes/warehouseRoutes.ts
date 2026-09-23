import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { 
  getWarehouses, 
  createWarehouse, 
  updateWarehouse, 
  getStockLedger, 
  getWarehouseStock 
} from '../controllers/warehouseController';

const router = express.Router();

router.get('/', protect, getWarehouses);
router.post('/', protect, createWarehouse);
router.put('/:id', protect, updateWarehouse);

router.get('/ledger', protect, getStockLedger);
router.get('/stock', protect, getWarehouseStock);

export default router;
