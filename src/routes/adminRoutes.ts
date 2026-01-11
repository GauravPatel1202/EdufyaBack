import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Middleware to check for Admin role should be here ideally.
// For now, reusing authMiddleware. Controller level checks or Middleware expansion recommended.

router.get('/users', authMiddleware, adminController.getAllUsers);
router.put('/users/:id/role', authMiddleware, adminController.updateUserRole);

export default router;
