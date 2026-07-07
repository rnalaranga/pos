import express from 'express';
import { protect, adminOnly } from '../middlewares/authMiddleware';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/userController';

const router = express.Router();

router.route('/')
  .get(protect, adminOnly, getUsers)
  .post(protect, adminOnly, createUser);

router.route('/:id')
  .put(protect, adminOnly, updateUser)
  .delete(protect, adminOnly, deleteUser);

export default router;
