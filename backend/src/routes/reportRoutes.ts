import express from 'express';
import { protect, managerOrAdmin } from '../middlewares/authMiddleware';
import { getDashboardStats, getShiftSummary, getAdvancedReports, getFastMovingProducts, getDailySales } from '../controllers/reportController';

const router = express.Router();

router.get('/dashboard', protect, managerOrAdmin, getDashboardStats);
router.get('/fast-moving', protect, getFastMovingProducts);
router.get('/shift', protect, managerOrAdmin, getShiftSummary);
router.get('/advanced', protect, managerOrAdmin, getAdvancedReports);
router.get('/daily-sales', protect, managerOrAdmin, getDailySales);

export default router;
