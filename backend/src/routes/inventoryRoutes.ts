import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getInventoryHistory, adjustStock, transferStock } from '../controllers/inventoryController';

const router = express.Router();

router.get('/history', protect, getInventoryHistory);
router.post('/adjust', protect, adjustStock);
router.post('/transfer', protect, transferStock);

export default router;
