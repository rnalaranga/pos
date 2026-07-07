import express from 'express';
import { protect, managerOrAdmin } from '../middlewares/authMiddleware';
import { getDashboardStats, getShiftSummary, getAdvancedReports } from '../controllers/reportController';

const router = express.Router();

router.get('/dashboard', protect, managerOrAdmin, getDashboardStats);
router.get('/shift', protect, managerOrAdmin, getShiftSummary);
router.get('/advanced', protect, managerOrAdmin, getAdvancedReports);

export default router;
