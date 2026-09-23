import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import { getGRNs, createGRN, getGRNById } from '../controllers/grnController';

const router = express.Router();

router.route('/')
  .get(protect, getGRNs)
  .post(protect, createGRN);

router.route('/:id')
  .get(protect, getGRNById);

export default router;
