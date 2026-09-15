import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getCurrentShift, openShift, closeShift, getShiftSummary } from '../controllers/shiftController';

const router = express.Router();

router.get('/current', protect, getCurrentShift);
router.post('/open', protect, openShift);
router.post('/:id/close', protect, closeShift);
router.get('/:id/summary', protect, getShiftSummary);

export default router;
