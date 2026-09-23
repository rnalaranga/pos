import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getDashboardStats, getShiftSummary, getAdvancedReports, getFastMovingProducts, getDailySales } from '../controllers/reportController';

const router = express.Router();

router.get('/dashboard', protect, getDashboardStats);
router.get('/fast-moving', protect, getFastMovingProducts);
router.get('/shift', protect, getShiftSummary);
router.get('/advanced', protect, getAdvancedReports);
router.get('/daily-sales', protect, getDailySales);

export default router;
