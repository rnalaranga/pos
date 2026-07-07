import express from 'express';
import { protect, managerOrAdmin } from '../middlewares/authMiddleware';
import { getInventoryHistory, adjustStock, transferStock } from '../controllers/inventoryController';

const router = express.Router();

router.get('/history', protect, managerOrAdmin, getInventoryHistory);
router.post('/adjust', protect, managerOrAdmin, adjustStock);
router.post('/transfer', protect, managerOrAdmin, transferStock);

export default router;
