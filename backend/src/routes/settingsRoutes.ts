import express from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware';
import { getSettings, updateSettings } from '../controllers/settingsController';

const router = express.Router();

router.route('/')
  .get(protect, getSettings)
  .post(protect, adminOnly, updateSettings);

export default router;
