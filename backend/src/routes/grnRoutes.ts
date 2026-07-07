import express from 'express';
import { protect, managerOrAdmin } from '../middlewares/authMiddleware';
import { getGRNs, createGRN, getGRNById } from '../controllers/grnController';

const router = express.Router();

router.route('/')
  .get(protect, managerOrAdmin, getGRNs)
  .post(protect, managerOrAdmin, createGRN);

router.route('/:id')
  .get(protect, managerOrAdmin, getGRNById);

export default router;
